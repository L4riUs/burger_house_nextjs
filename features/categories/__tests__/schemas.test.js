import { describe, it, expect } from "vitest";
import { categorySchema, categoryFormSchema } from "../schemas";

describe("Category Schemas", () => {
  describe("categorySchema", () => {
    it("acepta datos válidos completos", () => {
      const result = categorySchema.safeParse({
        name: { es: "Bebidas", en: "Drinks" },
        description: { es: "Bebidas frías y calientes", en: "Cold and hot drinks" },
        applies_to: "product",
        sort_order: 1,
      });
      expect(result.success).toBe(true);
    });

    it("acepta datos mínimos válidos", () => {
      const result = categorySchema.safeParse({
        name: { es: "Carnes", en: "" },
        description: { es: "", en: "" },
        applies_to: "raw_material",
        sort_order: 0,
      });
      expect(result.success).toBe(true);
    });

    it("rechaza nombre en español vacío", () => {
      const result = categorySchema.safeParse({
        name: { es: "", en: "Drinks" },
        applies_to: "product",
        sort_order: 0,
      });
      expect(result.success).toBe(false);
      expect(result.error.issues.length).toBeGreaterThan(0);
      const errorMessage = result.error.issues[0].message;
      expect(errorMessage).toContain("requerido");
    });

    it("rechaza applies_to inválido", () => {
      const result = categorySchema.safeParse({
        name: { es: "Test", en: "" },
        applies_to: "invalid",
        sort_order: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza sort_order negativo", () => {
      const result = categorySchema.safeParse({
        name: { es: "Test", en: "" },
        applies_to: "product",
        sort_order: -1,
      });
      expect(result.success).toBe(false);
    });

    it("aplica valores por defecto", () => {
      const result = categorySchema.safeParse({
        name: { es: "Test", en: "" },
        applies_to: "product",
      });
      expect(result.success).toBe(true);
      expect(result.data.sort_order).toBe(0);
      expect(result.data.description.es).toBe("");
      expect(result.data.description.en).toBe("");
    });
  });

  describe("categoryFormSchema", () => {
    it("valida igual que categorySchema", () => {
      const result = categoryFormSchema.safeParse({
        name: { es: "Bebidas", en: "Drinks" },
        description: { es: "Desc", en: "Desc" },
        applies_to: "raw_material",
        sort_order: 5,
      });
      expect(result.success).toBe(true);
    });

    it("requiere applies_to", () => {
      const result = categoryFormSchema.safeParse({
        name: { es: "Test", en: "" },
        description: { es: "", en: "" },
        applies_to: "",
        sort_order: 0,
      });
      expect(result.success).toBe(false);
    });
  });
});