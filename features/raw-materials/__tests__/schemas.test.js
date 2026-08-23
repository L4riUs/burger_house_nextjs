import { describe, it, expect } from "vitest";
import { rawMaterialSchema, rawMaterialFormSchema } from "../schemas";

describe("Raw Material Schemas", () => {
  describe("rawMaterialSchema", () => {
    it("acepta datos válidos completos", () => {
      const result = rawMaterialSchema.safeParse({
        name: "Carne de res",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        unit_id: "123e4567-e89b-12d3-a456-426614174001",
        min_stock: 10,
        average_cost: 25.50,
        primary_supplier_id: "123e4567-e89b-12d3-a456-426614174002",
      });
      expect(result.success).toBe(true);
    });

    it("acepta datos mínimos válidos", () => {
      const result = rawMaterialSchema.safeParse({
        name: "Lechuga",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        unit_id: "123e4567-e89b-12d3-a456-426614174001",
        min_stock: 0,
        average_cost: 0,
        primary_supplier_id: null,
      });
      expect(result.success).toBe(true);
    });

    it("rechaza nombre vacío", () => {
      const result = rawMaterialSchema.safeParse({
        name: "",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        unit_id: "123e4567-e89b-12d3-a456-426614174001",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza category_id inválido", () => {
      const result = rawMaterialSchema.safeParse({
        name: "Test",
        category_id: "invalid-uuid",
        unit_id: "123e4567-e89b-12d3-a456-426614174001",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza unit_id inválido", () => {
      const result = rawMaterialSchema.safeParse({
        name: "Test",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        unit_id: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza min_stock negativo", () => {
      const result = rawMaterialSchema.safeParse({
        name: "Test",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        unit_id: "123e4567-e89b-12d3-a456-426614174001",
        min_stock: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza average_cost negativo", () => {
      const result = rawMaterialSchema.safeParse({
        name: "Test",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        unit_id: "123e4567-e89b-12d3-a456-426614174001",
        average_cost: -1,
      });
      expect(result.success).toBe(false);
    });

    it("aplica valores por defecto", () => {
      const result = rawMaterialSchema.safeParse({
        name: "Test",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        unit_id: "123e4567-e89b-12d3-a456-426614174001",
      });
      expect(result.success).toBe(true);
      expect(result.data.min_stock).toBe(0);
      expect(result.data.average_cost).toBe(0);
    });
  });

  describe("rawMaterialFormSchema", () => {
    it("valida igual que rawMaterialSchema", () => {
      const result = rawMaterialFormSchema.safeParse({
        name: "Pan de hamburguesa",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        unit_id: "123e4567-e89b-12d3-a456-426614174001",
        min_stock: 20,
        average_cost: 1.50,
        primary_supplier_id: null,
      });
      expect(result.success).toBe(true);
    });
  });
});