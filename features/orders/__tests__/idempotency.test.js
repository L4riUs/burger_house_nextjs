import { describe, it, expect, vi, beforeEach } from "vitest";

const U = {
  staff: "10000000-0000-4000-8000-000000000001",
  product: "30000000-0000-4000-8000-000000000003",
  payment: "60000000-0000-4000-8000-000000000006",
  order: "70000000-0000-4000-8000-000000000007",
  guest: "80000000-0000-4000-8000-000000000008",
};

function buildSupabaseMock() {
  const chains = {};
  const mock = {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    table: () => {},
    from: vi.fn(),
  };
  mock.rpc.mockResolvedValue({ data: null, error: null });

  const makeChain = (name) => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      is: vi.fn(),
      in: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    chain.is.mockReturnValue(chain);
    chain.in.mockReturnValue(chain);
    chain.update.mockReturnValue(chain);
    chain.delete.mockReturnValue(chain);
    chain._insertResult = { data: null, error: null };
    chain.insert.mockImplementation(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve(chain._insertResult)),
      })),
    }));
    return chain;
  };

  const getTable = (name) => {
    if (!chains[name]) {
      chains[name] = makeChain(name);
    }
    return chains[name];
  };

  mock.from = vi.fn(getTable);
  mock.table = getTable;

  return mock;
}

let mockSupabase;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(mockSupabase),
}));

vi.mock("@/lib/config", () => ({
  ALLOW_NEGATIVE_STOCK: true,
  POS_PAYMENT_VERIFICATION: "after",
}));

vi.mock("@/lib/bcv", () => ({
  getBcvRate: vi.fn().mockResolvedValue(36.5),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createOrder } from "@/features/orders/actions";

beforeEach(() => {
  mockSupabase = buildSupabaseMock();
});

describe("createOrder - Idempotency (client_ref)", () => {
  const baseFormData = (overrides = {}) => ({
    fulfillment_type: "pickup",
    table_id: null,
    delivery_address: null,
    currency: "VES",
    exchange_rate: 36.5,
    cart_items: [
      { type: "product", product_id: U.product, quantity: 2, extras: [] },
    ],
    customer_type: "guest",
    profile_id: null,
    guest_customer: { full_name: "Juan Pérez", phone: "0412-1234567", address: null },
    payment_method_id: U.payment,
    channel: "pos",
    notes: "Sin hielo",
    ...overrides,
  });

  function setupStaffEnv() {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: U.staff } },
      error: null,
    });
    mockSupabase.table("profiles").single.mockResolvedValue({ data: { role: "owner" }, error: null });
    mockSupabase.table("products").single.mockResolvedValue({ data: { price_ves: 100, price_usd: 2.7 }, error: null });
    mockSupabase.table("product_extras").single.mockResolvedValue({ data: { price_ves: 5, price_usd: 0.14 }, error: null });
    mockSupabase.table("guest_customers")._insertResult = { data: { id: U.guest }, error: null };
    mockSupabase.table("orders")._insertResult = { data: { id: U.order, order_number: 1001, channel: "pos", taken_by: U.staff, client_ref: "91000000-0000-4000-8000-000000000001" }, error: null };
  }

  it("creates new order when client_ref is new", async () => {
    setupStaffEnv();
    mockSupabase.table("orders").single.mockResolvedValue({ data: null, error: null });

    const result = await createOrder(baseFormData({ client_ref: "91000000-0000-4000-8000-000000000001" }));

    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.client_ref).toBe("91000000-0000-4000-8000-000000000001");
    expect(result.data.already_synced).toBeUndefined();
  });

  it("returns existing order when client_ref already exists (idempotency)", async () => {
    setupStaffEnv();
    mockSupabase.table("orders").single.mockResolvedValue({
      data: { id: U.order, order_number: 999, status: "pending" },
      error: null,
    });

    const result = await createOrder(baseFormData({ client_ref: "92000000-0000-4000-8000-000000000002" }));

    expect(result.success).toBe("Orden ya sincronizada");
    expect(result.data.id).toBe(U.order);
    expect(result.data.order_number).toBe(999);
    expect(result.data.already_synced).toBe(true);
    expect(mockSupabase.table("orders").insert).not.toHaveBeenCalled();
  });

  it("does not create duplicate order_items when client_ref exists", async () => {
    setupStaffEnv();
    mockSupabase.table("orders").single.mockResolvedValue({
      data: { id: U.order, order_number: 999, status: "pending" },
      error: null,
    });

    await createOrder(baseFormData({ client_ref: "92000000-0000-4000-8000-000000000002" }));

    expect(mockSupabase.table("order_items").insert).not.toHaveBeenCalled();
    expect(mockSupabase.table("order_status_history").insert).not.toHaveBeenCalled();
  });

  it("works with storefront channel (guest, no taken_by)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabase.table("profiles").single.mockResolvedValue({ data: null, error: null });
    mockSupabase.table("orders").single.mockResolvedValue({
      data: { id: U.order, order_number: 555, status: "pending" },
      error: null,
    });

    const result = await createOrder(
      baseFormData({ channel: "storefront", taken_by: null, client_ref: "93000000-0000-4000-8000-000000000003" })
    );

    expect(result.success).toBe("Orden ya sincronizada");
    expect(result.data.already_synced).toBe(true);
  });

  it("does not check client_ref when not provided", async () => {
    setupStaffEnv();
    mockSupabase.table("orders").single.mockResolvedValue({ data: null, error: null });

    const result = await createOrder(baseFormData({ client_ref: null }));

    expect(result.success).toBe("Orden creada correctamente");
    expect(mockSupabase.table("orders").single).not.toHaveBeenCalled();
  });

  it("handles concurrent requests with same client_ref (race condition simulation)", async () => {
    setupStaffEnv();
    mockSupabase.table("orders").single.mockResolvedValue({
      data: { id: U.order, order_number: 777, status: "pending" },
      error: null,
    });

    const formData = baseFormData({ client_ref: "94000000-0000-4000-8000-000000000004" });
    const [result1, result2] = await Promise.all([
      createOrder(formData),
      createOrder(formData),
    ]);

    expect(result1.success).toBe("Orden ya sincronizada");
    expect(result2.success).toBe("Orden ya sincronizada");
    expect(result1.data.id).toBe(result2.data.id);
    expect(result1.data.already_synced).toBe(true);
    expect(result2.data.already_synced).toBe(true);
  });
});