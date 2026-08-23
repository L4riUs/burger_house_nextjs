import { describe, it, expect } from "vitest";
import { unitSchema, unitFormSchema } from "../schemas";

describe("Unit Schemas", () => {
  describe("unitSchema", () => {
    it("acepta datos válidos completos", () => {
      const result = unitSchema.safeParse({
        name: "Kilogramo",
        abbreviation: "kg",
        unit_type: "mass",
        conversion_factor: 1000,
        is_base_unit: false,
      });
      expect(result.success).toBe(true);
    });

    it("acepta unidad base", () => {
      const result = unitSchema.safeParse({
        name: "Gramo",
        abbreviation: "g",
        unit_type: "mass",
        conversion_factor: 1,
        is_base_unit: true,
      });
      expect(result.success).toBe(true);
    });

    it("rechaza nombre vacío", () => {
      const result = unitSchema.safeParse({
        name: "",
        abbreviation: "kg",
        unit_type: "mass",
        conversion_factor: 1000,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza abreviatura vacía", () => {
      const result = unitSchema.safeParse({
        name: "Kilogramo",
        abbreviation: "",
        unit_type: "mass",
        conversion_factor: 1000,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza unit_type inválido", () => {
      const result = unitSchema.safeParse({
        name: "Test",
        abbreviation: "t",
        unit_type: "invalid",
        conversion_factor: 1,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza conversion_factor <= 0", () => {
      const result = unitSchema.safeParse({
        name: "Test",
        abbreviation: "t",
        unit_type: "mass",
        conversion_factor: 0,
      });
      expect(result.success).toBe(false);

      const result2 = unitSchema.safeParse({
        name: "Test",
        abbreviation: "t",
        unit_type: "mass",
        conversion_factor: -1,
      });
      expect(result2.success).toBe(false);
    });

    it("aplica valores por defecto", () => {
      const result = unitSchema.safeParse({
        name: "Test",
        abbreviation: "t",
        unit_type: "mass",
      });
      expect(result.success).toBe(true);
      expect(result.data.conversion_factor).toBe(1);
      expect(result.data.is_base_unit).toBe(false);
    });
  });

  describe("unitFormSchema", () => {
    it("valida igual que unitSchema", () => {
      const result = unitFormSchema.safeParse({
        name: "Litro",
        abbreviation: "l",
        unit_type: "volume",
        conversion_factor: 1000,
        is_base_unit: false,
      });
      expect(result.success).toBe(true);
    });
  });
});