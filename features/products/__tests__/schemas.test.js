import { describe, it, expect } from "vitest";
import { productSchema, productFormSchema } from "../schemas";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "123e4567-e89b-12d3-a456-426614170001";
const VALID_UUID_3 = "123e4567-e89b-12d3-a456-426614170002";

describe("Product Schemas", () => {
  describe("productSchema - prepared products", () => {
    it("acepta un producto preparado con receta válida", () => {
      const result = productSchema.safeParse({
        product_type: "prepared",
        category_id: VALID_UUID,
        name: "Hamburguesa Clásica",
        price_usd: 5.0,
        recipe_items: [
          { raw_material_id: VALID_UUID_2, quantity: 200 },
          { raw_material_id: VALID_UUID_3, quantity: 50 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rechaza un producto preparado sin receta", () => {
      const result = productSchema.safeParse({
        product_type: "prepared",
        category_id: VALID_UUID,
        name: "Hamburguesa Clásica",
        price_usd: 5.0,
        recipe_items: [],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza un producto preparado con receta vacía (undefined)", () => {
      const result = productSchema.safeParse({
        product_type: "prepared",
        category_id: VALID_UUID,
        name: "Hamburguesa Clásica",
        price_usd: 5.0,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza materias primas duplicadas en la receta", () => {
      const result = productSchema.safeParse({
        product_type: "prepared",
        category_id: VALID_UUID,
        name: "Hamburguesa Doble",
        price_usd: 8.0,
        recipe_items: [
          { raw_material_id: VALID_UUID_2, quantity: 200 },
          { raw_material_id: VALID_UUID_2, quantity: 100 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("acepta cantidad positiva en receta", () => {
      const result = productSchema.safeParse({
        product_type: "prepared",
        category_id: VALID_UUID,
        name: "Hamburguesa",
        price_usd: 5.0,
        recipe_items: [
          { raw_material_id: VALID_UUID_2, quantity: 0.5 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rechaza cantidad cero o negativa en receta", () => {
      const result = productSchema.safeParse({
        product_type: "prepared",
        category_id: VALID_UUID,
        name: "Hamburguesa",
        price_usd: 5.0,
        recipe_items: [
          { raw_material_id: VALID_UUID_2, quantity: 0 },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("productSchema - retail products", () => {
    it("acepta un producto retail sin receta", () => {
      const result = productSchema.safeParse({
        product_type: "retail",
        category_id: VALID_UUID,
        name: "Papas Fritas",
        price_usd: 3.0,
        min_stock: 10,
      });
      expect(result.success).toBe(true);
    });

    it("aplica valor por defecto a min_stock", () => {
      const result = productSchema.safeParse({
        product_type: "retail",
        category_id: VALID_UUID,
        name: "Papas Fritas",
        price_usd: 3.0,
      });
      expect(result.success).toBe(true);
      expect(result.data.min_stock).toBe(0);
    });
  });

  describe("productSchema - common validations", () => {
    it("rechaza nombre vacío", () => {
      const result = productSchema.safeParse({
        product_type: "retail",
        category_id: VALID_UUID,
        name: "",
        price_usd: 5.0,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza category_id inválido", () => {
      const result = productSchema.safeParse({
        product_type: "retail",
        category_id: "invalid",
        name: "Test",
        price_usd: 5.0,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza precio negativo", () => {
      const result = productSchema.safeParse({
        product_type: "retail",
        category_id: VALID_UUID,
        name: "Test",
        price_usd: -1,
      });
      expect(result.success).toBe(false);
    });

    it("acepta precios en cero", () => {
      const result = productSchema.safeParse({
        product_type: "retail",
        category_id: VALID_UUID,
        name: "Test",
        price_usd: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("productFormSchema", () => {
    it("valida igual que productSchema para casos válidos", () => {
      const result = productFormSchema.safeParse({
        product_type: "prepared",
        category_id: VALID_UUID,
        name: "Hamburguesa",
        price_usd: 5.0,
        recipe_items: [
          { raw_material_id: VALID_UUID_2, quantity: 200 },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
