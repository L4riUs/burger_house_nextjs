import { describe, it, expect } from "vitest";
import { inventoryMovementBatchSchema } from "../schemas";
import { MOVEMENT_TYPES } from "../lib/movement-utils";

describe("inventoryMovementBatchSchema", () => {
  const validRawMaterialItem = {
    item_type: "raw_material",
    raw_material_id: "550e8400-e29b-41d4-a716-446655440000",
    product_id: null,
    movement_type: MOVEMENT_TYPES.PURCHASE_IN,
    quantity: 10,
    unit_id: "550e8400-e29b-41d4-a716-446655440001",
    unit_cost: 25.50,
    supplier_id: "550e8400-e29b-41d4-a716-446655440002",
    note: "Compra de prueba",
  };

  const validProductItem = {
    item_type: "product",
    raw_material_id: null,
    product_id: "550e8400-e29b-41d4-a716-446655440003",
    movement_type: MOVEMENT_TYPES.ADJUSTMENT_IN,
    quantity: 5,
    unit_id: null,
    unit_cost: null,
    supplier_id: null,
    note: "Ajuste de inventario",
  };

  it("debe fallar con array vacío", () => {
    const result = inventoryMovementBatchSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Debe haber al menos una línea de movimiento");
    }
  });

  it("debe pasar con 1 ítem válido de materia prima (compra)", () => {
    const result = inventoryMovementBatchSchema.safeParse({ items: [validRawMaterialItem] });
    expect(result.success).toBe(true);
  });

  it("debe pasar con 1 ítem válido de producto retail (ajuste)", () => {
    const result = inventoryMovementBatchSchema.safeParse({ items: [validProductItem] });
    expect(result.success).toBe(true);
  });

  it("debe pasar con múltiples ítems válidos", () => {
    const result = inventoryMovementBatchSchema.safeParse({ items: [validRawMaterialItem, validProductItem] });
    expect(result.success).toBe(true);
  });

  it("debe fallar si ítem de compra no tiene proveedor", () => {
    const itemSinProveedor = { ...validRawMaterialItem, supplier_id: null };
    const result = inventoryMovementBatchSchema.safeParse({ items: [itemSinProveedor] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("supplier_id");
      expect(result.error.issues[0].message).toBe("El proveedor es requerido para compras");
    }
  });

  it("debe fallar si ítem de compra no tiene costo unitario", () => {
    const itemSinCosto = { ...validRawMaterialItem, unit_cost: null };
    const result = inventoryMovementBatchSchema.safeParse({ items: [itemSinCosto] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("unit_cost");
      expect(result.error.issues[0].message).toBe("El costo unitario es requerido para compras");
    }
  });

  it("debe fallar si ítem de compra tiene costo unitario <= 0", () => {
    const itemCostoCero = { ...validRawMaterialItem, unit_cost: 0 };
    const result = inventoryMovementBatchSchema.safeParse({ items: [itemCostoCero] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("unit_cost");
      expect(result.error.issues[0].message).toBe("El costo unitario es requerido para compras");
    }
  });

  it("debe pasar para ajuste sin proveedor ni costo", () => {
    const ajusteItem = {
      ...validRawMaterialItem,
      movement_type: MOVEMENT_TYPES.ADJUSTMENT_IN,
      supplier_id: null,
      unit_cost: null,
    };
    const result = inventoryMovementBatchSchema.safeParse({ items: [ajusteItem] });
    expect(result.success).toBe(true);
  });

  it("debe fallar si materia prima no tiene raw_material_id", () => {
    const itemSinMaterial = { ...validRawMaterialItem, raw_material_id: null };
    const result = inventoryMovementBatchSchema.safeParse({ items: [itemSinMaterial] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("raw_material_id");
    }
  });

  it("debe fallar si producto retail no tiene product_id", () => {
    const itemSinProducto = { ...validProductItem, product_id: null };
    const result = inventoryMovementBatchSchema.safeParse({ items: [itemSinProducto] });
    expect(result.success).toBe(false);
    if (!result.success) {
      // El schema usa path hardcoded a "raw_material_id" para ambos casos (ver schemas.js)
      expect(result.error.issues[0].path).toContain("raw_material_id");
    }
  });

  it("debe fallar si cantidad no es positiva", () => {
    const itemCantidadCero = { ...validRawMaterialItem, quantity: 0 };
    const result = inventoryMovementBatchSchema.safeParse({ items: [itemCantidadCero] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("quantity");
      expect(result.error.issues[0].message).toBe("La cantidad debe ser mayor a 0");
    }
  });

  it("debe identificar el índice del ítem problemático en el error", () => {
    const items = [
      validRawMaterialItem,
      { ...validRawMaterialItem, supplier_id: null }, // Segundo item sin proveedor
    ];
    const result = inventoryMovementBatchSchema.safeParse({ items });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain(1); // Índice 1 (segundo ítem)
      expect(result.error.issues[0].path).toContain("supplier_id");
    }
  });
});