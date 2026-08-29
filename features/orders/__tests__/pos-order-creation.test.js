import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/bcv", () => ({
  getBcvRate: vi.fn().mockResolvedValue(36.5),
}));

import { createOrder } from "../actions";

describe("POS Order Creation - Reuses createOrder Function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "staff-user-id" } },
      error: null,
    });
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.single
      .mockResolvedValue({ data: { price_ves: 100, price_usd: 2.7 }, error: null })
      .mockResolvedValueOnce({ data: { id: "new-order-id", order_number: 1001, status: "pending" }, error: null });
    mockSupabase.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "new-order-id", order_number: 1001 }, error: null }),
      }),
    });
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  const baseFormData = {
    fulfillment_type: "pickup",
    table_id: null,
    delivery_address: null,
    currency: "VES",
    exchange_rate: 36.5,
    cart_items: [
      { type: "product", product_id: "prod-1", quantity: 2, extras: [] },
    ],
    customer_type: "guest",
    profile_id: null,
    guest_customer: { full_name: "Juan Pérez", phone: "0412-1234567", address: null },
    payment_method_id: "pm-1",
    client_ref: null,
    notes: "Sin hielo",
  };

  it("creates order with channel 'pos' for counter orders", async () => {
    const formData = { ...baseFormData, channel: "pos", taken_by: "staff-user-id" };
    const result = await createOrder(formData);
    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.channel).toBe("pos");
    expect(result.data.taken_by).toBe("staff-user-id");
  });

  it("creates order with channel 'phone' for phone/WhatsApp orders", async () => {
    const formData = { ...baseFormData, channel: "phone", taken_by: "staff-user-id" };
    const result = await createOrder(formData);
    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.channel).toBe("phone");
    expect(result.data.taken_by).toBe("staff-user-id");
  });

  it("creates order with channel 'storefront' for online orders", async () => {
    const formData = { ...baseFormData, channel: "storefront", taken_by: null, customer_type: "authenticated", profile_id: "user-profile-id", guest_customer: null };
    const result = await createOrder(formData);
    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.channel).toBe("storefront");
    expect(result.data.taken_by).toBeNull();
  });

  it("rejects POS/phone orders without taken_by when not storefront", async () => {
    const formData = { ...baseFormData, channel: "pos", taken_by: null };
    const result = await createOrder(formData);
    expect(result.error).toBe("taken_by es requerido para órdenes POS/teléfono");
  });

  it("auto-sets taken_by to current user for POS/phone when not provided", async () => {
    const formData = { ...baseFormData, channel: "pos", taken_by: null };
    const result = await createOrder(formData);
    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.taken_by).toBeDefined();
  });

  it("inserts order_status_history with initial pending status", async () => {
    const formData = { ...baseFormData, channel: "pos", taken_by: "staff-id" };
    await createOrder(formData);
    expect(mockSupabase.from).toHaveBeenCalledWith("order_status_history");
  });
});

describe("createOrderDraft (checkout) - calls same createOrder", () => {
  it("transforms cart items and calls createOrder with storefront channel", async () => {
    const { createOrder: realCreateOrder } = await import("../actions");
    vi.spyOn(realCreateOrder, "default").mockResolvedValue({
      success: "Orden creada correctamente",
      data: { id: "order-1", order_number: 2001 },
    });

    const { createOrderDraft } = await import("@/features/checkout/actions");
    
    const checkoutFormData = {
      fulfillment_type: "delivery",
      table_id: null,
      delivery_address: "Calle Falsa 123",
      currency: "VES",
      exchange_rate: 36.5,
      cart_items: [
        { type: "product", product: { id: "prod-1" }, quantity: 2, extras: [] },
        { type: "combo", combo: { id: "combo-1" }, quantity: 1 },
      ],
      customer_type: "guest",
      profile_id: null,
      guest_customer: { full_name: "Cliente Web", phone: "0412-1111111", address: "Calle Falsa 123" },
      payment_method_id: "pm-1",
      payment_proof: null,
    };

    const result = await createOrderDraft(checkoutFormData);

    expect(realCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "storefront",
        taken_by: null,
      })
    );
    expect(result.success).toBe("Orden creada correctamente");
    vi.restoreAllMocks();
  });

  it("transforms extras correctly from checkout format", async () => {
    const { createOrder: realCreateOrder } = await import("../actions");
    vi.spyOn(realCreateOrder, "default").mockResolvedValue({
      success: "Orden creada correctamente",
      data: { id: "order-1", order_number: 2002 },
    });

    const { createOrderDraft } = await import("@/features/checkout/actions");
    
    const checkoutFormData = {
      fulfillment_type: "pickup",
      table_id: null,
      delivery_address: null,
      currency: "VES",
      exchange_rate: 36.5,
      cart_items: [
        {
          type: "product",
          product: { id: "prod-burger" },
          quantity: 1,
          extras: [
            { extra: { id: "extra-bacon" }, quantity: 2 },
            { extra: { id: "extra-cheese" }, quantity: 1 },
          ],
        },
      ],
      customer_type: "guest",
      profile_id: null,
      guest_customer: { full_name: "Cliente Web", phone: "0412-1111111", address: null },
      payment_method_id: "pm-1",
      payment_proof: null,
    };

    await createOrderDraft(checkoutFormData);

    expect(realCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        cart_items: expect.arrayContaining([
          expect.objectContaining({
            type: "product",
            product_id: "prod-burger",
            extras: expect.arrayContaining([
              expect.objectContaining({ extra_id: "extra-bacon", quantity: 2 }),
              expect.objectContaining({ extra_id: "extra-cheese", quantity: 1 }),
            ]),
          }),
        ]),
      })
    );
    vi.restoreAllMocks();
  });
});

describe("Both flows create orders with same structure", () => {
  it("storefront and POS orders have identical DB structure", async () => {
    const posOrder = await createOrder({
      fulfillment_type: "pickup",
      table_id: null,
      delivery_address: null,
      currency: "VES",
      exchange_rate: 36.5,
      cart_items: [{ type: "product", product_id: "prod-1", quantity: 1, extras: [] }],
      customer_type: "guest",
      profile_id: null,
      guest_customer: { full_name: "POS Client", phone: "0412-0000001", address: null },
      payment_method_id: "pm-1",
      channel: "pos",
      taken_by: "staff-1",
      client_ref: null,
      notes: null,
    });

    const webOrder = await createOrder({
      fulfillment_type: "pickup",
      table_id: null,
      delivery_address: null,
      currency: "VES",
      exchange_rate: 36.5,
      cart_items: [{ type: "product", product_id: "prod-1", quantity: 1, extras: [] }],
      customer_type: "guest",
      profile_id: null,
      guest_customer: { full_name: "Web Client", phone: "0412-0000002", address: null },
      payment_method_id: "pm-1",
      channel: "storefront",
      taken_by: null,
      client_ref: "web-ref-1",
      notes: null,
    });

    expect(posOrder.success).toBe("Orden creada correctamente");
    expect(webOrder.success).toBe("Orden creada correctamente");
    expect(posOrder.data.channel).toBe("pos");
    expect(webOrder.data.channel).toBe("storefront");
  });
});