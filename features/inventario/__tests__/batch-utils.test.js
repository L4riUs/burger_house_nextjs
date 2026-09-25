import { describe, it, expect } from "vitest";
import { buildBatchInsertPayload, BatchValidationError } from "../lib/batch-utils";

const mockUnits = [
  { id: "unit-kg", unit_type: "mass", conversion_factor: 1, abbreviation: "kg" },
  { id: "unit-g", unit_type: "mass", conversion_factor: 0.001, abbreviation: "g" },
  { id: "unit-l", unit_type: "volume", conversion_factor: 1, abbreviation: "l" },
  { id: "unit-ml", unit_type: "volume", conversion_factor: 0.001, abbreviation: "ml" },
  { id: "unit-un", unit_type: "count", conversion_factor: 1, abbreviation: "un" },
];

const mockMaterials = [
  {
    id: "mat-carne",
    name: "Carne",
    unit_id: "unit-kg",
    unit: { id: "unit-kg", unit_type: "mass", conversion_factor: 1, abbreviation: "kg" },
    min_stock: 10,
  },
  {
    id: "mat-pan",
    name: "Pan",
    unit_id: "unit-kg",
    unit: { id: "unit-kg", unit_type: "mass", conversion_factor: 1, abbreviation: "kg" },
    min_stock: 20,
  },
  {
    id: "mat-leche",
    name: "Leche",
    unit_id: "unit-l",
    unit: { id: "unit-l", unit_type: "volume", conversion_factor: 1, abbreviation: "l" },
    min_stock: 5,
  },
];

describe("buildBatchInsertPayload", () => {
  it("debe convertir kg a g correctamente (1 kg = 1000 g)", () => {
    const items = [
      {
        item_type: "raw_material",
        raw_material_id: "mat-carne",
        product_id: null,
        movement_type: "purchase_in",
        quantity: 1,
        unit_id: "unit-kg",
        unit_cost: 50,
        supplier_id: "sup-1",
        note: "",
      },
    ];

    const payload = buildBatchInsertPayload(items, mockUnits, mockMaterials);

    expect(payload).toHaveLength(1);
    expect(payload[0].quantity).toBe(1); // 1 kg se mantiene en kg (unidad base del material)
    expect(payload[0].unit_id).toBe("unit-kg");
  });

  it("debe convertir g a kg correctamente (1000 g = 1 kg)", () => {
    const items = [
      {
        item_type: "raw_material",
        raw_material_id: "mat-carne",
        product_id: null,
        movement_type: "purchase_in",
        quantity: 1000,
        unit_id: "unit-g",
        unit_cost: 0.05,
        supplier_id: "sup-1",
        note: "",
      },
    ];

    const payload = buildBatchInsertPayload(items, mockUnits, mockMaterials);

    expect(payload).toHaveLength(1);
    expect(payload[0].quantity).toBe(1); // 1000 g = 1 kg
    expect(payload[0].unit_id).toBe("unit-kg"); // Se guarda en unidad base del material
  });

  it("debe lanzar error si unidad incompatible (mass vs volume)", () => {
    const items = [
      {
        item_type: "raw_material",
        raw_material_id: "mat-leche", // usa litros (volume)
        product_id: null,
        movement_type: "purchase_in",
        quantity: 1,
        unit_id: "unit-kg", // intenta registrar en kg (mass)
        unit_cost: 10,
        supplier_id: "sup-1",
        note: "",
      },
    ];

    expect(() => buildBatchInsertPayload(items, mockUnits, mockMaterials))
      .toThrow(BatchValidationError);
  });

  it("debe incluir el índice del ítem en el error de unidad incompatible", () => {
    const items = [
      {
        item_type: "raw_material",
        raw_material_id: "mat-carne",
        product_id: null,
        movement_type: "purchase_in",
        quantity: 1,
        unit_id: "unit-kg",
        unit_cost: 50,
        supplier_id: "sup-1",
        note: "",
      },
      {
        item_type: "raw_material",
        raw_material_id: "mat-leche", // usa litros
        product_id: null,
        movement_type: "purchase_in",
        quantity: 1,
        unit_id: "unit-kg", // incompatible
        unit_cost: 10,
        supplier_id: "sup-1",
        note: "",
      },
    ];

    try {
      buildBatchInsertPayload(items, mockUnits, mockMaterials);
      expect(true).toBe(false); // No debería llegar aquí
    } catch (err) {
      expect(err).toBeInstanceOf(BatchValidationError);
      expect(err.itemIndex).toBe(1); // Segundo ítem (índice 1)
      expect(err.message).toContain("Ítem 2:");
      expect(err.message).toContain("Unidad incompatible");
    }
  });

  it("debe permitir producto retail sin unit_id (sin conversión)", () => {
    const items = [
      {
        item_type: "product",
        raw_material_id: null,
        product_id: "prod-hamburguesa",
        movement_type: "adjustment_in",
        quantity: 10,
        unit_id: null,
        unit_cost: null,
        supplier_id: null,
        note: "",
      },
    ];

    const payload = buildBatchInsertPayload(items, mockUnits, mockMaterials);

    expect(payload).toHaveLength(1);
    expect(payload[0].item_type).toBe("product");
    expect(payload[0].product_id).toBe("prod-hamburguesa");
    expect(payload[0].quantity).toBe(10);
    expect(payload[0].unit_id).toBeNull();
  });

  it("debe usar unit_id del material si no se proporciona en el ítem", () => {
    const items = [
      {
        item_type: "raw_material",
        raw_material_id: "mat-carne",
        product_id: null,
        movement_type: "purchase_in",
        quantity: 5,
        unit_id: null, // No se proporciona, debería usar la del material
        unit_cost: 50,
        supplier_id: "sup-1",
        note: "",
      },
    ];

    const payload = buildBatchInsertPayload(items, mockUnits, mockMaterials);

    expect(payload).toHaveLength(1);
    expect(payload[0].unit_id).toBe("unit-kg");
    expect(payload[0].quantity).toBe(5);
  });

  it("debe procesar batch completo con múltiples ítems", () => {
    const items = [
      {
        item_type: "raw_material",
        raw_material_id: "mat-carne",
        product_id: null,
        movement_type: "purchase_in",
        quantity: 2,
        unit_id: "unit-kg",
        unit_cost: 50,
        supplier_id: "sup-1",
        note: "Compra carne",
      },
      {
        item_type: "raw_material",
        raw_material_id: "mat-pan",
        product_id: null,
        movement_type: "purchase_in",
        quantity: 5000,
        unit_id: "unit-g",
        unit_cost: 0.02,
        supplier_id: "sup-1",
        note: "Compra pan",
      },
      {
        item_type: "product",
        raw_material_id: null,
        product_id: "prod-refresco",
        movement_type: "adjustment_in",
        quantity: 24,
        unit_id: null,
        unit_cost: null,
        supplier_id: null,
        note: "Ajuste refrescos",
      },
    ];

    const payload = buildBatchInsertPayload(items, mockUnits, mockMaterials);

    expect(payload).toHaveLength(3);

    // Primer ítem: 2 kg (unidad base kg)
    expect(payload[0].quantity).toBe(2);
    expect(payload[0].unit_id).toBe("unit-kg");

    // Segundo ítem: 5000 g = 5 kg (convertido a unidad base del material)
    expect(payload[1].quantity).toBe(5);
    expect(payload[1].unit_id).toBe("unit-kg");

    // Tercer ítem: producto retail sin conversión
    expect(payload[2].quantity).toBe(24);
    expect(payload[2].unit_id).toBeNull();
    expect(payload[2].product_id).toBe("prod-refresco");
  });

  it("debe lanzar error si material no encontrado", () => {
    const items = [
      {
        item_type: "raw_material",
        raw_material_id: "mat-inexistente",
        product_id: null,
        movement_type: "purchase_in",
        quantity: 1,
        unit_id: "unit-kg",
        unit_cost: 10,
        supplier_id: "sup-1",
        note: "",
      },
    ];

    expect(() => buildBatchInsertPayload(items, mockUnits, mockMaterials))
      .toThrow(BatchValidationError);
  });

  it("debe lanzar error si array vacío", () => {
    expect(() => buildBatchInsertPayload([], mockUnits, mockMaterials))
      .toThrow("El batch debe contener al menos un ítem");
  });

  it("debe preservar supplier_id y note en cada ítem", () => {
    const items = [
      {
        item_type: "raw_material",
        raw_material_id: "mat-carne",
        product_id: null,
        movement_type: "purchase_in",
        quantity: 1,
        unit_id: "unit-kg",
        unit_cost: 50,
        supplier_id: "sup-proveedor-a",
        note: "Nota específica",
      },
    ];

    const payload = buildBatchInsertPayload(items, mockUnits, mockMaterials);

    expect(payload[0].supplier_id).toBe("sup-proveedor-a");
    expect(payload[0].note).toBe("Nota específica");
  });

  it("debe manejar movimiento de salida (sale_out) sin requerir supplier_id ni unit_cost", () => {
    const items = [
      {
        item_type: "raw_material",
        raw_material_id: "mat-carne",
        product_id: null,
        movement_type: "sale_out",
        quantity: 2,
        unit_id: "unit-kg",
        unit_cost: null,
        supplier_id: null,
        note: "Venta",
      },
    ];

    const payload = buildBatchInsertPayload(items, mockUnits, mockMaterials);

    expect(payload).toHaveLength(1);
    expect(payload[0].movement_type).toBe("sale_out");
    expect(payload[0].supplier_id).toBeNull();
    expect(payload[0].unit_cost).toBeNull();
  });
});