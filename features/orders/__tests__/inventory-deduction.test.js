import { describe, it, expect, vi, beforeEach } from "vitest";
import { ALLOW_NEGATIVE_STOCK } from "@/lib/config";

vi.mock("@/lib/config", () => ({
  ALLOW_NEGATIVE_STOCK: true,
}));

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

import { calculateInventoryMovements, checkStockAvailability } from "../inventory-deduction";

describe("Inventory Deduction - Movement Calculations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.in.mockReturnValue(mockSupabase);
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  describe("calculateInventoryMovements", () => {
    it("returns empty arrays for empty order items", async () => {
      const result = await calculateInventoryMovements([], mockSupabase);
      expect(result.movements).toEqual([]);
      expect(result.stockChecks).toEqual([]);
    });

    describe("product type 'prepared' (with recipe)", () => {
      it("generates sale_out movements for each recipe item", async () => {
        const mockRecipeItems = [
          { raw_material_id: "rm-1", quantity: "0.2" },
          { raw_material_id: "rm-2", quantity: "0.1" },
        ];

        mockSupabase.single
          .mockResolvedValueOnce({ data: { product_type: "prepared" }, error: null })
          .mockResolvedValueOnce({ data: mockRecipeItems, error: null });

        const orderItems = [
          {
            type: "product",
            product_id: "prod-1",
            quantity: 2,
            extras: [],
          },
        ];

        const result = await calculateInventoryMovements(orderItems, mockSupabase);

        expect(result.movements).toHaveLength(2);
        expect(result.movements[0]).toMatchObject({
          item_type: "raw_material",
          raw_material_id: "rm-1",
          movement_type: "sale_out",
          quantity: 0.4,
        });
        expect(result.movements[1]).toMatchObject({
          item_type: "raw_material",
          raw_material_id: "rm-2",
          movement_type: "sale_out",
          quantity: 0.2,
        });
      });

      it("multiplies recipe quantity by order quantity", async () => {
        mockSupabase.single
          .mockResolvedValueOnce({ data: { product_type: "prepared" }, error: null })
          .mockResolvedValueOnce({ data: [{ raw_material_id: "rm-1", quantity: "0.5" }], error: null });

        const orderItems = [
          {
            type: "product",
            product_id: "prod-1",
            quantity: 3,
            extras: [],
          },
        ];

        const result = await calculateInventoryMovements(orderItems, mockSupabase);

        expect(result.movements[0].quantity).toBe(1.5);
      });

      it("adds stockChecks when ALLOW_NEGATIVE_STOCK is false", async () => {
        vi.doMock("@/lib/config", () => ({ ALLOW_NEGATIVE_STOCK: false }));
        
        mockSupabase.single
          .mockResolvedValueOnce({ data: { product_type: "prepared" }, error: null })
          .mockResolvedValueOnce({ data: [{ raw_material_id: "rm-1", quantity: "0.2" }], error: null });

        const orderItems = [
          {
            type: "product",
            product_id: "prod-1",
            quantity: 2,
            extras: [],
          },
        ];

        const result = await calculateInventoryMovements(orderItems, mockSupabase);

        expect(result.stockChecks).toHaveLength(1);
        expect(result.stockChecks[0]).toMatchObject({
          item_type: "raw_material",
          item_id: "rm-1",
          required_qty: 0.4,
        });
      });
    });

    describe("product type 'retail'", () => {
      it("generates sale_out movement for the product itself", async () => {
        mockSupabase.single.mockResolvedValueOnce({
          data: { product_type: "retail" },
          error: null,
        });

        const orderItems = [
          {
            type: "product",
            product_id: "prod-retail-1",
            quantity: 5,
            extras: [],
          },
        ];

        const result = await calculateInventoryMovements(orderItems, mockSupabase);

        expect(result.movements).toHaveLength(1);
        expect(result.movements[0]).toMatchObject({
          item_type: "product",
          product_id: "prod-retail-1",
          movement_type: "sale_out",
          quantity: 5,
        });
      });
    });

    describe("extras with raw_material_id", () => {
      it("generates sale_out for extra's raw material", async () => {
        mockSupabase.single
          .mockResolvedValueOnce({ data: { product_type: "prepared" }, error: null })
          .mockResolvedValueOnce({ data: [{ raw_material_id: "rm-recipe", quantity: "0.1" }], error: null })
          .mockResolvedValueOnce({ data: { raw_material_id: "rm-extra", raw_material_quantity: "0.05" }, error: null });

        const orderItems = [
          {
            type: "product",
            product_id: "prod-1",
            quantity: 2,
            extras: [
              { extra_id: "extra-1", quantity: 1 },
            ],
          },
        ];

        const result = await calculateInventoryMovements(orderItems, mockSupabase);

        const extraMovement = result.movements.find(
          (m) => m.raw_material_id === "rm-extra"
        );
        expect(extraMovement).toMatchObject({
          item_type: "raw_material",
          raw_material_id: "rm-extra",
          movement_type: "sale_out",
          quantity: 0.1,
        });
      });

      it("multiplies extra raw_material_quantity by extra quantity and product quantity", async () => {
        mockSupabase.single
          .mockResolvedValueOnce({ data: { product_type: "prepared" }, error: null })
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: { raw_material_id: "rm-bacon", raw_material_quantity: "0.02" }, error: null });

        const orderItems = [
          {
            type: "product",
            product_id: "prod-1",
            quantity: 3,
            extras: [
              { extra_id: "extra-bacon", quantity: 2 },
            ],
          },
        ];

        const result = await calculateInventoryMovements(orderItems, mockSupabase);

        const extraMovement = result.movements.find(
          (m) => m.raw_material_id === "rm-bacon"
        );
        expect(extraMovement.quantity).toBe(0.12);
      });

      it("ignores extras without raw_material_id", async () => {
        mockSupabase.single
          .mockResolvedValueOnce({ data: { product_type: "prepared" }, error: null })
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: { raw_material_id: null, raw_material_quantity: 1 }, error: null });

        const orderItems = [
          {
            type: "product",
            product_id: "prod-1",
            quantity: 1,
            extras: [
              { extra_id: "extra-no-rm", quantity: 1 },
            ],
          },
        ];

        const result = await calculateInventoryMovements(orderItems, mockSupabase);

        expect(result.movements.every((m) => m.raw_material_id !== "extra-no-rm")).toBe(true);
      });
    });

    describe("combos", () => {
      it("expands combo items recursively", async () => {
        mockSupabase.single
          .mockResolvedValueOnce({ data: { product_type: "prepared" }, error: null })
          .mockResolvedValueOnce({ data: [{ raw_material_id: "rm-burger", quantity: "0.15" }], error: null })
          .mockResolvedValueOnce({ data: { product_type: "retail" }, error: null })
          .mockResolvedValueOnce({ data: [{ raw_material_id: "rm-drink", quantity: "0.3" }], error: null });

        const orderItems = [
          {
            type: "combo",
            combo_id: "combo-1",
            quantity: 2,
          },
        ];

        mockSupabase.from.mockImplementation((table) => {
          if (table === "combo_items") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({
                data: [
                  { quantity: 1, product: { id: "prod-burger", product_type: "prepared" } },
                  { quantity: 1, product: { id: "prod-drink", product_type: "retail" } },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase;
        });

        const result = await calculateInventoryMovements(orderItems, mockSupabase);

        expect(result.movements).toHaveLength(3);
      });
    });
  });

  describe("checkStockAvailability", () => {
    it("returns ok: true for empty stockChecks", async () => {
      const result = await checkStockAvailability([], mockSupabase);
      expect(result.ok).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it("detects insufficient raw_material stock", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ item_id: "rm-1", stock: 0.5 }],
          error: null,
        }),
      }));

      const stockChecks = [
        { item_type: "raw_material", item_id: "rm-1", required_qty: 1.0 },
      ];

      const result = await checkStockAvailability(stockChecks, mockSupabase);

      expect(result.ok).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatchObject({
        item_type: "raw_material",
        item_id: "rm-1",
        current_stock: 0.5,
        required_qty: 1.0,
        shortage: 0.5,
      });
    });

    it("detects insufficient product stock", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ item_id: "prod-1", stock: 2 }],
          error: null,
        }),
      }));

      const stockChecks = [
        { item_type: "product", item_id: "prod-1", required_qty: 5 },
      ];

      const result = await checkStockAvailability(stockChecks, mockSupabase);

      expect(result.ok).toBe(false);
      expect(result.warnings[0].shortage).toBe(3);
    });

    it("returns ok when stock is sufficient", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ item_id: "rm-1", stock: 10 }],
          error: null,
        }),
      }));

      const stockChecks = [
        { item_type: "raw_material", item_id: "rm-1", required_qty: 5 },
      ];

      const result = await checkStockAvailability(stockChecks, mockSupabase);

      expect(result.ok).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it("handles multiple items with mixed results", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { item_id: "rm-1", stock: 10 },
            { item_id: "rm-2", stock: 1 },
          ],
          error: null,
        }),
      }));

      const stockChecks = [
        { item_type: "raw_material", item_id: "rm-1", required_qty: 5 },
        { item_type: "raw_material", item_id: "rm-2", required_qty: 5 },
      ];

      const result = await checkStockAvailability(stockChecks, mockSupabase);

      expect(result.ok).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].item_id).toBe("rm-2");
    });

    it("treats missing stock as 0", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      const stockChecks = [
        { item_type: "raw_material", item_id: "rm-missing", required_qty: 1 },
      ];

      const result = await checkStockAvailability(stockChecks, mockSupabase);

      expect(result.ok).toBe(false);
      expect(result.warnings[0].current_stock).toBe(0);
      expect(result.warnings[0].shortage).toBe(1);
    });
  });
});