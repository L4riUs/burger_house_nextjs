import { describe, it, expect, vi, beforeEach } from "vitest";

// En este archivo el modo de verificación de pago es 'before': el pago se exige
// antes de que la orden de mostrador pueda llegar a la cocina.
vi.mock("@/lib/config", () => ({
  ALLOW_NEGATIVE_STOCK: true,
  POS_PAYMENT_VERIFICATION: "before",
}));

const U = {
  staff: "10000000-0000-4000-8000-000000000001",
  product: "30000000-0000-4000-8000-000000000003",
  combo: "40000000-0000-4000-8000-000000000004",
  extra: "50000000-0000-4000-8000-000000000005",
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
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
    chain.limit.mockReturnValue(chain);
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

vi.mock("@/lib/bcv", () => ({
  getBcvRate: vi.fn().mockResolvedValue(36.5),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createOrder } from "../actions";

beforeEach(() => {
  mockSupabase = buildSupabaseMock();
  vi.clearAllMocks();
});

describe("POS Order Creation - modo 'before' (el pago debe confirmarse antes de cocina)", () => {
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
    client_ref: null,
    notes: "Sin hielo",
    channel: "pos",
    ...overrides,
  });

  function setupStaffEnv() {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: U.staff } },
      error: null,
    });
    mockSupabase.table("profiles").single.mockResolvedValue({ data: { role: "owner" }, error: null });
    mockSupabase.table("products").single.mockResolvedValue({ data: { price_ves: 100, price_usd: 2.7 }, error: null });
    mockSupabase.table("combos").single.mockResolvedValue({ data: { price_ves: 50, price_usd: 1.35 }, error: null });
    mockSupabase.table("product_extras").single.mockResolvedValue({ data: { price_ves: 5, price_usd: 0.14 }, error: null });
    mockSupabase.table("guest_customers")._insertResult = { data: { id: U.guest }, error: null };
    mockSupabase.table("orders")._insertResult = { data: { id: U.order, order_number: 1001, channel: "pos", taken_by: U.staff }, error: null };
  }

  it("pago digital SIN comprobante: queda pending y NO va a cocina", async () => {
    setupStaffEnv();
    // Método digital (no efectivo).
    mockSupabase.table("payment_methods").single.mockResolvedValue({ data: { provider_code: "pago_movil" }, error: null });

    const result = await createOrder(baseFormData());

    expect(result.success).toBe("Orden creada correctamente");
    const inserted = mockSupabase.table("orders").insert.mock.calls[0][0];
    expect(inserted.status).toBe("pending");
    // No salta directo a cocina: se exige el pago antes.
    expect(mockSupabase.rpc).not.toHaveBeenCalledWith("confirm_order_with_inventory", expect.anything());
  });

  it("pago digital CON comprobante capturado: se confirma y va a cocina (proof approved)", async () => {
    setupStaffEnv();
    mockSupabase.table("payment_methods").single.mockResolvedValue({ data: { provider_code: "pago_movil" }, error: null });

    const result = await createOrder(
      baseFormData({
        payment_proof: {
          provider_code: "pago_movil",
          reference_number: "REF-001",
          payer_phone: "0412-1234567",
          payer_id_number: "V-123",
          receipt_path: "pos/x.png",
        },
      })
    );

    expect(result.success).toBe("Orden creada correctamente");
    const inserted = mockSupabase.table("orders").insert.mock.calls[0][0];
    expect(inserted.status).toBe("pending");
    // El proof que capturó el cajero queda aprobado.
    expect(mockSupabase.table("order_payment_proofs").insert).toHaveBeenCalledWith(
      expect.objectContaining({ order_id: U.order, status: "approved" })
    );
    // Como el pago está confirmado, va a cocina.
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "confirm_order_with_inventory",
      expect.objectContaining({ p_order_id: U.order })
    );
  });

  it("pago en efectivo: va a cocina sin necesidad de comprobante", async () => {
    setupStaffEnv();
    // Efectivo → provider_code null → isCash true.
    mockSupabase.table("payment_methods").single.mockResolvedValue({ data: { provider_code: null }, error: null });

    const result = await createOrder(baseFormData());

    expect(result.success).toBe("Orden creada correctamente");
    const inserted = mockSupabase.table("orders").insert.mock.calls[0][0];
    expect(inserted.status).toBe("pending");
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "confirm_order_with_inventory",
      expect.objectContaining({ p_order_id: U.order })
    );
  });
});