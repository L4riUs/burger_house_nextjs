import { describe, it, expect } from "vitest";
import { comboSchema, comboFormSchema } from "../schemas";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "123e4567-e89b-12d3-a456-426614170001";
const VALID_UUID_3 = "123e4567-e89b-12d3-a456-426614170002";

describe("Combo Schemas", () => {
  describe("comboSchema", () => {
    it("acepta un combo válido con 1 producto", () => {
      const result = comboSchema.safeParse({
        name: "Combo Básico",
        price_usd: 10.0,
        combo_items: [
          { product_id: VALID_UUID, quantity: 1 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("acepta un combo con múltiples productos", () => {
      const result = comboSchema.safeParse({
        name: "Combo Familiar",
        price_usd: 25.0,
        combo_items: [
          { product_id: VALID_UUID, quantity: 2 },
          { product_id: VALID_UUID_2, quantity: 1 },
          { product_id: VALID_UUID_3, quantity: 3 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rechaza un combo sin productos", () => {
      const result = comboSchema.safeParse({
        name: "Combo Vacío",
        price_usd: 10.0,
        combo_items: [],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza productos duplicados en el combo", () => {
      const result = comboSchema.safeParse({
        name: "Combo Duplicado",
        price_usd: 10.0,
        combo_items: [
          { product_id: VALID_UUID, quantity: 1 },
          { product_id: VALID_UUID, quantity: 2 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza cantidad menor a 1", () => {
      const result = comboSchema.safeParse({
        name: "Combo",
        price_usd: 10.0,
        combo_items: [
          { product_id: VALID_UUID, quantity: 0 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza nombre vacío", () => {
      const result = comboSchema.safeParse({
        name: "",
        price_usd: 10.0,
        combo_items: [
          { product_id: VALID_UUID, quantity: 1 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza precio negativo", () => {
      const result = comboSchema.safeParse({
        name: "Combo",
        price_usd: -1,
        combo_items: [
          { product_id: VALID_UUID, quantity: 1 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("aplica valor por defecto a is_active", () => {
      const result = comboSchema.safeParse({
        name: "Combo",
        price_usd: 10.0,
        combo_items: [
          { product_id: VALID_UUID, quantity: 1 },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.data.is_active).toBe(true);
    });
  });

  describe("comboFormSchema", () => {
    it("valida igual que comboSchema para casos válidos", () => {
      const result = comboFormSchema.safeParse({
        name: "Combo Form",
        price_usd: 15.0,
        combo_items: [
          { product_id: VALID_UUID, quantity: 1 },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("combo pricing calculation", () => {
    it("calcula la suma de precios de productos del combo", () => {
      const products = [
        { id: VALID_UUID, price_usd: 5.0 },
        { id: VALID_UUID_2, price_usd: 3.0 },
      ];
      const comboItems = [
        { product_id: VALID_UUID, quantity: 2 },
        { product_id: VALID_UUID_2, quantity: 1 },
      ];

      const totalPrice = comboItems.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.product_id);
        return sum + (product?.price_usd || 0) * item.quantity;
      }, 0);

      expect(totalPrice).toBe(13.0);
    });

    it("calcula el ahorro del combo vs suma de productos", () => {
      const comboPriceUsd = 20.0;
      const products = [
        { id: VALID_UUID, price_usd: 5.0 },
        { id: VALID_UUID_2, price_usd: 8.0 },
        { id: VALID_UUID_3, price_usd: 10.0 },
      ];
      const comboItems = [
        { product_id: VALID_UUID, quantity: 1 },
        { product_id: VALID_UUID_2, quantity: 1 },
        { product_id: VALID_UUID_3, quantity: 1 },
      ];

      const sumProducts = comboItems.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.product_id);
        return sum + (product?.price_usd || 0) * item.quantity;
      }, 0);

      const savings = sumProducts - comboPriceUsd;

      expect(sumProducts).toBe(23.0);
      expect(savings).toBe(3.0);
    });
  });
});
