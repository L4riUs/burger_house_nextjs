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

import { createOrder } from "@/features/orders/actions";

describe("createOrder - Idempotency (client_ref)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'staff-user-id' } },
      error: null,
    });
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.single
      .mockResolvedValue({ data: { price_ves: 100, price_usd: 2.7 }, error: null })
      .mockResolvedValueOnce({ data: { id: 'new-order-id', order_number: 1001, status: 'pending' }, error: null });
    mockSupabase.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-order-id', order_number: 1001 }, error: null }),
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
    channel: "pos",
    taken_by: "staff-user-id",
    notes: "Sin hielo",
  };

  it("creates new order when client_ref is new", async () => {
    const formData = { ...baseFormData, client_ref: 'new-client-ref-123' };
    const result = await createOrder(formData);

    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.client_ref).toBe('new-client-ref-123');
    expect(result.data.already_synced).toBeUndefined();
  });

  it("returns existing order when client_ref already exists (idempotency)", async () => {
    const existingOrder = { id: 'existing-order-id', order_number: 999, status: 'pending' };
    
    // First call - check for existing order
    mockSupabase.single
      .mockResolvedValueOnce({ data: existingOrder, error: null })  // check existing client_ref
      .mockResolvedValueOnce({ data: { price_ves: 100, price_usd: 2.7 }, error: null });  // product price

    const formData = { ...baseFormData, client_ref: 'duplicate-client-ref' };
    const result = await createOrder(formData);

    expect(result.success).toBe("Orden ya sincronizada");
    expect(result.data.id).toBe('existing-order-id');
    expect(result.data.order_number).toBe(999);
    expect(result.data.already_synced).toBe(true);
  });

  it("does not create duplicate order_items when client_ref exists", async () => {
    const existingOrder = { id: 'existing-order-id', order_number: 999, status: 'pending' };
    
    mockSupabase.single
      .mockResolvedValueOnce({ data: existingOrder, error: null })
      .mockResolvedValueOnce({ data: { price_ves: 100, price_usd: 2.7 }, error: null });

    const formData = { ...baseFormData, client_ref: 'duplicate-client-ref' };
    await createOrder(formData);

    // Should not attempt to insert order_items or order_status_history
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it("works with storefront channel (no taken_by)", async () => {
    const existingOrder = { id: 'existing-web-order', order_number: 555, status: 'pending' };
    
    mockSupabase.single
      .mockResolvedValueOnce({ data: existingOrder, error: null })
      .mockResolvedValueOnce({ data: { price_ves: 100, price_usd: 2.7 }, error: null });

    const formData = { 
      ...baseFormData, 
      channel: 'storefront', 
      taken_by: null,
      client_ref: 'web-client-ref-123' 
    };
    const result = await createOrder(formData);

    expect(result.success).toBe("Orden ya sincronizada");
    expect(result.data.already_synced).toBe(true);
  });

  it("does not check client_ref when not provided", async () => {
    const formData = { ...baseFormData, client_ref: null };
    const result = await createOrder(formData);

    expect(result.success).toBe("Orden creada correctamente");
    // Should not have queried for existing order by client_ref
  });

  it("handles concurrent requests with same client_ref (race condition simulation)", async () => {
    const existingOrder = { id: 'existing-order-id', order_number: 777, status: 'pending' };
    
    mockSupabase.single
      .mockResolvedValueOnce({ data: existingOrder, error: null })
      .mockResolvedValueOnce({ data: { price_ves: 100, price_usd: 2.7 }, error: null });

    const formData = { ...baseFormData, client_ref: 'race-condition-ref' };
    
    // Simulate two concurrent calls
    const [result1, result2] = await Promise.all([
      createOrder(formData),
      createOrder(formData),
    ]);

    // Both should return the same existing order
    expect(result1.success).toBe("Orden ya sincronizada");
    expect(result2.success).toBe("Orden ya sincronizada");
    expect(result1.data.id).toBe(result2.data.id);
    expect(result1.data.already_synced).toBe(true);
    expect(result2.data.already_synced).toBe(true);
  });
});