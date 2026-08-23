import { describe, it, expect } from "vitest";
import { convertUnits, UnitTypeMismatchError, findUnitById } from "@/lib/unit-conversion";

const mockUnits = [
  { id: "1", name: "Gramo", abbreviation: "g", unit_type: "mass", conversion_factor: 1, is_base_unit: true },
  { id: "2", name: "Kilogramo", abbreviation: "kg", unit_type: "mass", conversion_factor: 1000, is_base_unit: false },
  { id: "3", name: "Miligramo", abbreviation: "mg", unit_type: "mass", conversion_factor: 0.001, is_base_unit: false },
  { id: "4", name: "Litro", abbreviation: "l", unit_type: "volume", conversion_factor: 1000, is_base_unit: false },
  { id: "5", name: "Mililitro", abbreviation: "ml", unit_type: "volume", conversion_factor: 1, is_base_unit: true },
  { id: "6", name: "Unidad", abbreviation: "un", unit_type: "count", conversion_factor: 1, is_base_unit: true },
  { id: "7", name: "Docena", abbreviation: "doc", unit_type: "count", conversion_factor: 12, is_base_unit: false },
];

describe("Unit Conversion", () => {
  describe("findUnitById", () => {
    it("encuentra unidad por ID", () => {
      const unit = findUnitById(mockUnits, "2");
      expect(unit).toBeDefined();
      expect(unit.name).toBe("Kilogramo");
    });

    it("retorna undefined para ID inexistente", () => {
      const unit = findUnitById(mockUnits, "999");
      expect(unit).toBeUndefined();
    });
  });

  describe("convertUnits", () => {
    it("caso 1: misma unidad retorna el mismo valor", () => {
      const result = convertUnits(5, "1", "1", mockUnits);
      expect(result).toBe(5);
    });

    it("caso 2: conversión válida entre unidades del mismo tipo (kg -> g)", () => {
      const result = convertUnits(2, "2", "1", mockUnits);
      expect(result).toBe(2000);
    });

    it("caso 2b: conversión válida entre unidades del mismo tipo (g -> kg)", () => {
      const result = convertUnits(5000, "1", "2", mockUnits);
      expect(result).toBe(5);
    });

    it("caso 2c: conversión válida volumen (l -> ml)", () => {
      const result = convertUnits(1.5, "4", "5", mockUnits);
      expect(result).toBe(1500);
    });

    it("caso 2d: conversión válida conteo (docena -> unidad)", () => {
      const result = convertUnits(2, "7", "6", mockUnits);
      expect(result).toBe(24);
    });

    it("caso 3: error al convertir entre unit_type distintos (masa -> volumen)", () => {
      expect(() => {
        convertUnits(1000, "1", "5", mockUnits);
      }).toThrow(UnitTypeMismatchError);
    });

    it("caso 3b: error al convertir entre unit_type distintos (volumen -> masa)", () => {
      expect(() => {
        convertUnits(1000, "5", "1", mockUnits);
      }).toThrow(UnitTypeMismatchError);
    });

    it("caso 3c: error al convertir entre unit_type distintos (masa -> conteo)", () => {
      expect(() => {
        convertUnits(1000, "1", "6", mockUnits);
      }).toThrow(UnitTypeMismatchError);
    });

    it("lanza error si unidad origen no existe", () => {
      expect(() => {
        convertUnits(100, "999", "1", mockUnits);
      }).toThrow("Unidad no encontrada");
    });

    it("lanza error si unidad destino no existe", () => {
      expect(() => {
        convertUnits(100, "1", "999", mockUnits);
      }).toThrow("Unidad no encontrada");
    });

    it("maneja factores decimales correctamente (mg -> g)", () => {
      const result = convertUnits(5000, "3", "1", mockUnits);
      expect(result).toBe(5);
    });

    it("maneja conversión con decimales", () => {
      const result = convertUnits(1.5, "2", "1", mockUnits);
      expect(result).toBe(1500);
    });
  });
});