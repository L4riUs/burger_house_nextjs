import { describe, it, expect, vi, beforeEach } from "vitest";

function buildSupabaseMock() {
  const chains = {};
  const mock = { from: vi.fn() };

  const makeChain = (name) => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockImplementation(() => ({
        select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
      })),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.is.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    return chain;
  };

  const getTable = (name) => {
    if (!chains[name]) chains[name] = makeChain(name);
    return chains[name];
  };

  mock.from = vi.fn(getTable);
  return mock;
}

let mockSupabase;

beforeEach(() => {
  mockSupabase = buildSupabaseMock();
  vi.clearAllMocks();
});

describe("RB-06: Anulación de factura crea nota de crédito, nunca borra original", () => {
  it("crea una nota de crédito y NO modifica ni borra la original", async () => {
    mockSupabase.from("invoices").single.mockResolvedValue({
      data: {
        id: "inv-001",
        order_id: "ord-001",
        type: "invoice",
        currency: "VES",
        exchange_rate: 36.5,
        subtotal: 15000,
        tax_amount: 0,
        total: 15000,
        items_snapshot: [{ name: "Burger", quantity: 1 }],
      },
      error: null,
    });
    // No hay nota de crédito previa
    mockSupabase.from("invoices").maybeSingle.mockResolvedValue({ data: null, error: null });
    // La nota de crédito se inserta
    mockSupabase.from("invoices").insert.mockImplementation(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({ data: { id: "cn-002", type: "credit_note" }, error: null })
        ),
      })),
    }));

    const { voidInvoice } = await import("../core");

    const data = await voidInvoice(mockSupabase, {
      invoiceId: "inv-001",
      reason: "Cliente solicitó cancelación",
      userId: "user-1",
    });

    expect(data.type).toBe("credit_note");

    const insertArgs = mockSupabase.from("invoices").insert.mock.calls[0][0];
    expect(insertArgs.type).toBe("credit_note");
    expect(insertArgs.reference_invoice_id).toBe("inv-001");
    // La original no se tocó (solo single + insert de nota de crédito)
    expect(mockSupabase.from("invoices").single).toHaveBeenCalled();
    expect(mockSupabase.from("invoices").insert).toHaveBeenCalled();
  });

  it("rechaza anular una nota de crédito", async () => {
    mockSupabase.from("invoices").single.mockResolvedValue({
      data: { id: "inv-001", type: "credit_note" },
      error: null,
    });

    const { voidInvoice } = await import("../core");

    await expect(
      voidInvoice(mockSupabase, { invoiceId: "inv-001", reason: "x", userId: "user-1" })
    ).rejects.toThrow("No se puede anular una nota de crédito");
  });

  it("rechaza anular una factura ya anulada", async () => {
    mockSupabase.from("invoices").single.mockResolvedValue({
      data: { id: "inv-001", order_id: "ord-001", type: "invoice" },
      error: null,
    });
    mockSupabase.from("invoices").maybeSingle.mockResolvedValue({
      data: { id: "cn-002" },
      error: null,
    });

    const { voidInvoice } = await import("../core");

    await expect(
      voidInvoice(mockSupabase, { invoiceId: "inv-001", reason: "x", userId: "user-1" })
    ).rejects.toThrow("ya fue anulada");
  });
});

describe("createInvoiceFromOrder", () => {
  it("no duplica factura si ya existe para la orden", async () => {
    mockSupabase.from("invoices").select.mockReturnValue({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-inv" }, error: null }),
        })),
      })),
    });

    const { createInvoiceFromOrder } = await import("../core");

    const result = await createInvoiceFromOrder(mockSupabase, {
      orderId: "ord-001",
      userId: "user-1",
    });

    expect(result.id).toBe("existing-inv");
    // No se vuelve a insertar
    expect(mockSupabase.from("orders").select).not.toHaveBeenCalled();
  });
});
