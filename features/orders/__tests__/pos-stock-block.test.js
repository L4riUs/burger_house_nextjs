import { describe, it, expect, vi, beforeEach } from "vitest";

// En este archivo ALLOW_NEGATIVE_STOCK = false: si en una orden de mostrador
// (que va directo a cocina) falta stock, la orden NO se crea y se avisa al
// usuario.
vi.mock("@/lib/config", () => ({
  ALLOW_NEGATIVE_STOCK: false,
  POS_PAYMENT_VERIFICATION: "after",
}));

const U = {
  staff: "10000000-0000-4000-8000-000000000001",
  product: "30000000-0000-4000-8000-000000000003",
  payment: "60000000-0000-4000-8000-000000000006",
  order: "70000000-0000-4000-8000-000000000007",
  guest: "80000000-0000-4000-8000-000000000008",
  unit: "90000000-0000-4000-8000-000000000009",
  rawMaterial: "a0000000-0000-4000-8000-00000000000a",
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

describe("POS Order Creation - bloque por stock insuficiente (ALLOW_NEGATIVE_STOCK=false)", () => {
  const baseFormData = (overrides = {}) => ({
    fulfillment_type: "pickup",
    table_id: null,
    delivery_address: null,
    currency: "VES",
    exchange_rate: 36.5,
    cart_items: [
      { type: "product", product_id: U.product, quantity: 1, extras: [] },
    ],
    customer_type: "guest",
    profile_id: null,
    guest_customer: { full_name: "Juan Pérez", phone: "0412-1234567", address: null },
    payment_method_id: U.payment,
    client_ref: null,
    notes: "",
    channel: "pos",
    ...overrides,
  });

  // Configura el flujo: producto 'prepared' con receta de 1 materia prima y
  // unidades válidas. `currentStockRows` define el stock que devuelve current_stock.
  function setupStockEnv(currentStockRows) {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: U.staff } }, error: null });
    mockSupabase.table("profiles").single.mockResolvedValue({ data: { role: "owner" }, error: null });
    mockSupabase.table("products").single.mockResolvedValue({ data: { id: U.product, product_type: "prepared", price_ves: 100, price_usd: 2.7 }, error: null });
    mockSupabase.table("guest_customers")._insertResult = { data: { id: U.guest }, error: null };
    mockSupabase.table("orders")._insertResult = { data: { id: U.order, order_number: 1001, total_ves: 100, total_usd: 2.7 }, error: null };

    // Unidades
    mockSupabase.table("units").select.mockResolvedValue({
      data: [
        { id: U.unit, unit_type: "mass", conversion_factor: 1, abbreviation: "u" },
      ],
      error: null,
    });

    // Receta: recipe_items.select(...).eq('product_id', ...) resuelve filas
    mockSupabase.table("recipe_items").select.mockReturnValue({
      eq: vi.fn(() => Promise.resolve({
        data: [
          {
            quantity: 1,
            unit_id: U.unit,
            raw_material_id: U.rawMaterial,
            raw_material: { id: U.rawMaterial, name: "Carne", unit_id: U.unit },
          },
        ],
        error: null,
      })),
    });

    // current_stock: .select().eq().in() → resuelve las filas dadas
    mockSupabase.table("current_stock").select.mockReturnValue({
      eq: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ data: currentStockRows, error: null })),
      })),
    });
  }

  it("no inserta la orden (orders ni order_items) y devuelve error cuando falta stock", async () => {
    // stock actual 0 → shortage
    setupStockEnv([]);

    const result = await createOrder(baseFormData());

    expect(result.error).toBe("Stock insuficiente para completar la orden");
    expect(result.warnings).toBeDefined();
    expect(mockSupabase.table("orders").insert).not.toHaveBeenCalled();
    expect(mockSupabase.table("order_items").insert).not.toHaveBeenCalled();
  });

  it("también bloquea antes de crear en canales que quedan en pending (phone)", async () => {
    // stock actual 0 → shortage, canal phone (queda en pending)
    setupStockEnv([]);

    const result = await createOrder(baseFormData({ channel: "phone" }));

    expect(result.error).toBe("Stock insuficiente para completar la orden");
    expect(mockSupabase.table("orders").insert).not.toHaveBeenCalled();
    expect(mockSupabase.table("order_items").insert).not.toHaveBeenCalled();
  });

  it("sí crea la orden cuando hay stock suficiente", async () => {
    // stock actual 10 → suficiente
    setupStockEnv([{ item_id: U.rawMaterial, stock: 10 }]);

    const result = await createOrder(baseFormData());

    expect(result.success).toBe("Orden creada correctamente");
    expect(mockSupabase.table("orders").insert).toHaveBeenCalled();
  });
});