import { describe, it, expect, vi, beforeEach } from "vitest";

const U = {
  staff: "10000000-0000-4000-8000-000000000001",
  profile: "20000000-0000-4000-8000-000000000002",
  product: "30000000-0000-4000-8000-000000000003",
  combo: "40000000-0000-4000-8000-000000000004",
  extra: "50000000-0000-4000-8000-000000000005",
  extra2: "50000000-0000-4000-8000-000000000006",
  payment: "60000000-0000-4000-8000-000000000006",
  order: "70000000-0000-4000-8000-000000000007",
  orderItem: "71000000-0000-4000-8000-000000000001",
  guest: "80000000-0000-4000-8000-000000000008",
  clientRef: "90000000-0000-4000-8000-000000000009",
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

import { createOrder } from "../actions";
import { createOrderDraft } from "@/features/checkout/actions";

beforeEach(() => {
  mockSupabase = buildSupabaseMock();
});

describe("POS Order Creation - createOrder", () => {
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

  it("auto-asigna taken_by al staff autenticado en órdenes de mostrador (pos)", async () => {
    setupStaffEnv();
    const result = await createOrder(baseFormData({ channel: "pos" }));

    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.channel).toBe("pos");
    expect(result.data.taken_by).toBe(U.staff);

    const inserted = mockSupabase.table("orders").insert.mock.calls[0][0];
    expect(inserted.taken_by).toBe(U.staff);
  });

  it("crea órdenes por teléfono con taken_by del staff actual", async () => {
    setupStaffEnv();
    mockSupabase.table("orders")._insertResult = { data: { id: U.order, order_number: 1002, channel: "phone", taken_by: U.staff }, error: null };
    const result = await createOrder(baseFormData({ channel: "phone" }));

    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.channel).toBe("phone");
    expect(result.data.taken_by).toBe(U.staff);
  });

  it("crea órdenes storefront de un cliente autenticado sin taken_by", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: U.profile } },
      error: null,
    });
    mockSupabase.table("profiles").single.mockResolvedValue({ data: { role: "cliente" }, error: null });
    mockSupabase.table("products").single.mockResolvedValue({ data: { price_ves: 100, price_usd: 2.7 }, error: null });
    mockSupabase.table("product_extras").single.mockResolvedValue({ data: { price_ves: 5, price_usd: 0.14 }, error: null });
    mockSupabase.table("guest_customers")._insertResult = { data: { id: U.guest }, error: null };
    mockSupabase.table("orders")._insertResult = { data: { id: U.order, order_number: 2001, channel: "storefront", taken_by: null }, error: null };

    const result = await createOrder(
      baseFormData({
        channel: "storefront",
        customer_type: "authenticated",
        profile_id: U.profile,
        guest_customer: null,
        taken_by: null,
      })
    );

    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.channel).toBe("storefront");
    expect(result.data.taken_by).toBeNull();
  });

  it("permite checkout de invitado sin sesión en storefront", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabase.table("products").single.mockResolvedValue({ data: { price_ves: 100, price_usd: 2.7 }, error: null });
    mockSupabase.table("product_extras").single.mockResolvedValue({ data: { price_ves: 5, price_usd: 0.14 }, error: null });
    mockSupabase.table("guest_customers")._insertResult = { data: { id: U.guest }, error: null };
    mockSupabase.table("orders")._insertResult = { data: { id: U.order, order_number: 3001, channel: "storefront", taken_by: null }, error: null };

    const result = await createOrder(baseFormData({ channel: "storefront", taken_by: null }));

    expect(result.success).toBe("Orden creada correctamente");
    expect(result.data.channel).toBe("storefront");
    expect(result.data.taken_by).toBeNull();
  });

  it("rechaza órdenes internas sin rol de staff", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: U.profile } },
      error: null,
    });
    mockSupabase.table("profiles").single.mockResolvedValue({ data: { role: "cliente" }, error: null });

    const result = await createOrder(baseFormData({ channel: "pos" }));
    expect(result.error).toBe("No tienes permisos para crear órdenes internas");
  });

  it("rechaza órdenes internas sin sesión", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createOrder(baseFormData({ channel: "pos" }));
    expect(result.error).toBe("No autenticado");
  });

  it("valida carrito vacío y método de pago sin insertar", async () => {
    setupStaffEnv();
    const emptyCart = await createOrder(baseFormData({ cart_items: [] }));
    expect(emptyCart.error).toContain("El carrito no puede estar vacío");

    const noPayment = await createOrder(baseFormData({ payment_method_id: "no-una-uuid" }));
    expect(noPayment.error).toContain("Invalid UUID");

    expect(mockSupabase.table("orders").insert).not.toHaveBeenCalled();
  });

  it("POS efectivo: orden se crea y se confirma automáticamente (cola de cocina)", async () => {
    setupStaffEnv();
    // payment_methods.single devuelve null de fábrica → isCash true → directToKitchen
    await createOrder(baseFormData({ channel: "pos" }));

    // La orden se inserta en pending (requisito del RPC confirm_order_with_inventory)
    const inserted = mockSupabase.table("orders").insert.mock.calls[0][0];
    expect(inserted.status).toBe("pending");

    // El descuento en cocina se dispara vía confirm_order_with_inventory
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "confirm_order_with_inventory",
      expect.objectContaining({ p_order_id: U.order })
    );
  });

  it("POS: pago digital de igual forma confirma a cocina (la preparación no espera el cobro)", async () => {
    setupStaffEnv();

    await createOrder(
      baseFormData({
        channel: "pos",
        payment_proof: {
          provider_code: "pago_movil",
          reference_number: "REF-003",
          payer_phone: "0412-1234567",
          payer_id_number: "V-123",
          receipt_path: "pos/y.png",
        },
      })
    );

    // La orden se inserta pending y se dispara confirmación automática.
    const inserted = mockSupabase.table("orders").insert.mock.calls[0][0];
    expect(inserted.status).toBe("pending");
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "confirm_order_with_inventory",
      expect.objectContaining({ p_order_id: U.order })
    );
  });

  it("pasa profile_id cuando el cliente es autenticado/registrado", async () => {
    setupStaffEnv();
    await createOrder(
      baseFormData({
        channel: "pos",
        customer_type: "authenticated",
        profile_id: U.profile,
        guest_customer: null,
      })
    );

    const inserted = mockSupabase.table("orders").insert.mock.calls[0][0];
    expect(inserted.profile_id).toBe(U.profile);
    expect(inserted.guest_customer_id).toBeNull();
  });

  it("reutiliza el guest anónimo 'Cliente mostrador' para no duplicar filas", async () => {
    setupStaffEnv();
    // Ya existe un guest genérico
    mockSupabase.table("guest_customers").maybeSingle.mockResolvedValue({ data: { id: U.guest }, error: null });

    const result = await createOrder(
      baseFormData({
        channel: "pos",
        guest_customer: { full_name: "Cliente mostrador", phone: "-", address: null },
        guest_customer_id: null,
      })
    );

    expect(result.success).toBe("Orden creada correctamente");
    // No se inserta otro guest
    expect(mockSupabase.table("guest_customers").insert).not.toHaveBeenCalled();
    const inserted = mockSupabase.table("orders").insert.mock.calls[0][0];
    expect(inserted.guest_customer_id).toBe(U.guest);
  });

  it("crea el guest anónimo 'Cliente mostrador' solo la primera vez", async () => {
    setupStaffEnv();
    mockSupabase.table("guest_customers").maybeSingle.mockResolvedValue({ data: null, error: null });
    mockSupabase.table("guest_customers")._insertResult = { data: { id: U.guest }, error: null };

    const result = await createOrder(
      baseFormData({
        channel: "pos",
        guest_customer: { full_name: "Cliente mostrador", phone: "-", address: null },
        guest_customer_id: null,
      })
    );

    expect(result.success).toBe("Orden creada correctamente");
    expect(mockSupabase.table("guest_customers").insert).toHaveBeenCalledTimes(1);
  });

  it("persiste el comprobante de pago cuando viene en el payload", async () => {
    setupStaffEnv();
    mockSupabase.table("guest_customers")._insertResult = { data: { id: U.guest }, error: null };

    const result = await createOrder(
      baseFormData({
        channel: "pos",
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
    expect(mockSupabase.table("order_payment_proofs").insert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: U.order,
        payment_method_id: U.payment,
        reference_number: "REF-001",
        receipt_path: "pos/x.png",
        status: "approved",
      })
    );
  });

  it("rechaza orden con comprobante sin ruta de foto", async () => {
    setupStaffEnv();
    const result = await createOrder(
      baseFormData({
        channel: "pos",
        payment_proof: {
          provider_code: "binance",
          reference_number: "REF-002",
          payer_phone: null,
          payer_id_number: null,
          receipt_path: null,
        },
      })
    );

    expect(result.error).toContain("Debe adjuntar el comprobante de pago");
    expect(mockSupabase.table("order_payment_proofs").insert).not.toHaveBeenCalled();
  });
});

describe("createOrderDraft (checkout) - transforma y reutiliza createOrder", () => {
  const productItem = {
    id: "cart-line-1",
    type: "product",
    product: { id: U.product, name: "Hamburguesa", price_ves: 100, price_usd: 2.7 },
    quantity: 2,
    extras: [],
  };
  const comboItem = {
    id: "cart-line-2",
    type: "combo",
    combo: { id: U.combo, name: "Combo Clásico", price_ves: 50, price_usd: 1.35 },
    quantity: 1,
  };
  const baseCheckout = (overrides = {}) => ({
    fulfillment_type: "delivery",
    table_id: null,
    delivery_address: "Calle Falsa 123",
    currency: "VES",
    exchange_rate: 36.5,
    subtotal_ves: 250,
    subtotal_usd: 6.75,
    total_ves: 250,
    total_usd: 6.75,
    customer_type: "guest",
    profile_id: null,
    guest_customer: { full_name: "Cliente Web", phone: "0412-1111111", address: "Calle Falsa 123" },
    payment_method_id: U.payment,
    payment_proof: null,
    ...overrides,
  });

  function setupGuestEnv() {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabase.table("products").single.mockResolvedValue({ data: { price_ves: 100, price_usd: 2.7 }, error: null });
    mockSupabase.table("combos").single.mockResolvedValue({ data: { price_ves: 50, price_usd: 1.35 }, error: null });
    const productExtras = mockSupabase.table("product_extras");
    productExtras.eq.mockImplementation((col, val) => {
      productExtras._lastId = val;
      return productExtras;
    });
    productExtras.single.mockImplementation(() =>
      Promise.resolve({
        data: productExtras._lastId === U.extra2 ? { price_ves: 4, price_usd: 0.11 } : { price_ves: 5, price_usd: 0.14 },
        error: null,
      })
    );
    mockSupabase.table("guest_customers")._insertResult = { data: { id: U.guest }, error: null };
    mockSupabase.table("orders")._insertResult = { data: { id: U.order, order_number: 2001, channel: "storefront", taken_by: null }, error: null };
    mockSupabase.table("order_items")._insertResult = { data: { id: U.orderItem }, error: null };
  }

  it("transforma items del carrito y crea orden storefront de invitado", async () => {
    setupGuestEnv();
    const result = await createOrderDraft(
      baseCheckout({ cart_items: [productItem, comboItem] })
    );

    expect(result.success).toBe("Orden creada correctamente");

    const inserted = mockSupabase.table("orders").insert.mock.calls[0][0];
    expect(inserted.channel).toBe("storefront");
    expect(inserted.taken_by).toBeNull();
    expect(inserted.profile_id).toBeNull();
    expect(inserted.guest_customer_id).toBe(U.guest);

    const itemPayloads = mockSupabase.table("order_items").insert.mock.calls.map(c => c[0]);
    expect(itemPayloads).toContainEqual({ order_id: U.order, product_id: U.product, quantity: 2, unit_price_ves: 100, unit_price_usd: 2.7 });
    expect(itemPayloads).toContainEqual({ order_id: U.order, combo_id: U.combo, quantity: 1, unit_price_ves: 50, unit_price_usd: 1.35 });
  });

  it("transforma extras correctamente desde el formato del checkout", async () => {
    setupGuestEnv();
    const productWithExtras = {
      ...productItem,
      extras: [
        { id: "ex-1", extra: { id: U.extra, name: "Bacon", price_ves: 5, price_usd: 0.14 }, quantity: 2 },
        { id: "ex-2", extra: { id: U.extra2, name: "Queso", price_ves: 4, price_usd: 0.11 }, quantity: 1 },
      ],
    };
    const result = await createOrderDraft(
      baseCheckout({ cart_items: [productWithExtras] })
    );

    expect(result.success).toBe("Orden creada correctamente");

    const extraPayloads = mockSupabase.table("order_item_extras").insert.mock.calls.map(c => c[0]);
    expect(extraPayloads).toEqual([
      { order_item_id: U.orderItem, extra_id: U.extra, quantity: 2, unit_price_ves: 5, unit_price_usd: 0.14 },
      { order_item_id: U.orderItem, extra_id: U.extra2, quantity: 1, unit_price_ves: 4, unit_price_usd: 0.11 },
    ]);
  });

  it("POS y storefront generan la misma estructura de orden", async () => {
    // Orden POS (staff autenticado, canal pos)
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: U.staff } }, error: null });
    mockSupabase.table("profiles").single.mockResolvedValue({ data: { role: "owner" }, error: null });
    mockSupabase.table("products").single.mockResolvedValue({ data: { price_ves: 100, price_usd: 2.7 }, error: null });
    mockSupabase.table("product_extras").single.mockResolvedValue({ data: { price_ves: 5, price_usd: 0.14 }, error: null });
    mockSupabase.table("guest_customers")._insertResult = { data: { id: U.guest }, error: null };
    mockSupabase.table("orders")._insertResult = { data: { id: U.order, order_number: 1001, channel: "pos", taken_by: U.staff }, error: null };

    const posResult = await createOrder({
      fulfillment_type: "pickup",
      table_id: null,
      delivery_address: null,
      currency: "VES",
      exchange_rate: 36.5,
      cart_items: [{ type: "product", product_id: U.product, quantity: 1, extras: [] }],
      customer_type: "guest",
      profile_id: null,
      guest_customer: { full_name: "POS Client", phone: "0412-0000001", address: null },
      payment_method_id: U.payment,
      channel: "pos",
      client_ref: null,
      notes: null,
    });
    expect(posResult.success).toBe("Orden creada correctamente");

    // Orden storefront (invitado sin sesión)
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabase.table("orders")._insertResult = { data: { id: U.order, order_number: 2001, channel: "storefront", taken_by: null }, error: null };

    const webResult = await createOrder({
      fulfillment_type: "pickup",
      table_id: null,
      delivery_address: null,
      currency: "VES",
      exchange_rate: 36.5,
      cart_items: [{ type: "product", product_id: U.product, quantity: 1, extras: [] }],
      customer_type: "guest",
      profile_id: null,
      guest_customer: { full_name: "Web Client", phone: "0412-0000002", address: null },
      payment_method_id: U.payment,
      channel: "storefront",
      taken_by: null,
      client_ref: U.clientRef,
      notes: null,
    });
    expect(webResult.success).toBe("Orden creada correctamente");

    const posPayload = mockSupabase.table("orders").insert.mock.calls[0][0];
    const webPayload = mockSupabase.table("orders").insert.mock.calls[1][0];
    expect(Object.keys(posPayload).sort()).toEqual(Object.keys(webPayload).sort());
    expect(posPayload.taken_by).toBe(U.staff);
    expect(webPayload.taken_by).toBeNull();
  });
});