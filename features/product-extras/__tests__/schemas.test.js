import { describe, it, expect } from "vitest";
import { productExtraSchema, productExtraFormSchema } from "../schemas";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "123e4567-e89b-12d3-a456-426614170001";

describe("Product Extra Schemas", () => {
  describe("productExtraSchema", () => {
    it("acepta un adicional válido sin materia prima", () => {
      const result = productExtraSchema.safeParse({
        name: "Bacon Extra",
        price_usd: 1.5,
        product_ids: [VALID_UUID],
      });
      expect(result.success).toBe(true);
    });

    it("acepta un adicional con materia prima y cantidad", () => {
      const result = productExtraSchema.safeParse({
        name: "Queso Extra",
        price_usd: 1.0,
        raw_material_id: VALID_UUID_2,
        raw_material_quantity: 30,
        product_ids: [VALID_UUID],
      });
      expect(result.success).toBe(true);
    });

    it("rechaza adicional con materia prima pero sin cantidad", () => {
      const result = productExtraSchema.safeParse({
        name: "Queso Extra",
        price_usd: 1.0,
        raw_material_id: VALID_UUID_2,
        raw_material_quantity: null,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza nombre vacío", () => {
      const result = productExtraSchema.safeParse({
        name: "",
        price_usd: 1.0,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza precio negativo", () => {
      const result = productExtraSchema.safeParse({
        name: "Extra",
        price_usd: -1,
      });
      expect(result.success).toBe(false);
    });

    it("acepta product_ids vacío", () => {
      const result = productExtraSchema.safeParse({
        name: "Extra",
        price_usd: 1.0,
        product_ids: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("productExtraFormSchema", () => {
    it("valida igual que productExtraSchema para casos válidos", () => {
      const result = productExtraFormSchema.safeParse({
        name: "Extra Form",
        price_usd: 2.0,
        product_ids: [VALID_UUID],
      });
      expect(result.success).toBe(true);
    });
  });
});
