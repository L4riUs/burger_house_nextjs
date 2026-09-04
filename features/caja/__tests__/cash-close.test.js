import { describe, it, expect, vi, beforeEach } from "vitest";

function buildSupabaseMock() {
  const chains = {};
  const mock = {
    from: vi.fn(),
  };

  const makeChain = (name) => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockImplementation(() => ({
        select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
      })),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Por defecto select() encadena normalmente (devuelve el propio chain),
    // dejando que maybeSingle/single resuelvan. Los casos de arqueo usan
    // mockCalcEnv para rutear la consulta de ventas huérfanas por separado.
    chain.select.mockReturnValue(chain);

    chain.eq.mockReturnValue(chain);
    chain.is.mockReturnValue(chain);
    chain.gte.mockReturnValue(chain);
    chain.lte.mockReturnValue(chain);
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

describe("RB-03: Apertura de sesión de caja", () => {
  it("devuelve null cuando no hay sesión abierta", async () => {
    mockSupabase.from("cash_sessions").maybeSingle.mockResolvedValue({ data: null, error: null });

    const { getOpenCashSession, validateCashSessionForPayment } = await import("../core");

    const session = await getOpenCashSession(mockSupabase);
    expect(session).toBeNull();

    const result = await validateCashSessionForPayment(mockSupabase, true);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("No hay sesión de caja abierta");
  });

  it("valida ok para métodos no efectivos sin sesión", async () => {
    const { validateCashSessionForPayment } = await import("../core");

    const result = await validateCashSessionForPayment(mockSupabase, false);
    expect(result.ok).toBe(true);
    expect(result.session).toBeNull();
  });
});

describe("RB-04: createSaleTransaction guarda snapshot de tasa", () => {
  it("inserta transacción con exchange_rate dado", async () => {
    mockSupabase.from("financial_transactions").insert.mockImplementation(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({ data: { id: "txn-001", exchange_rate: 42.0 }, error: null })
        ),
      })),
    }));

    const { createSaleTransaction } = await import("../core");

    const data = await createSaleTransaction(mockSupabase, {
      orderId: "ord-001",
      cashSessionId: "sess-001",
      amount: 15000,
      currency: "VES",
      exchangeRate: 42.0,
      userId: "user-1",
    });

    expect(data.id).toBe("txn-001");
    const insertArgs = mockSupabase.from("financial_transactions").insert.mock.calls[0][0];
    expect(insertArgs.exchange_rate).toBe(42.0);
    expect(insertArgs.txn_type).toBe("sale");
  });
});

describe("calculateExpectedAmounts", () => {
  function mockCalcEnv({ session, sessionTxns = [], orphanSales = [] }) {
    const cs = mockSupabase.from("cash_sessions");
    cs.select.mockReturnValue({
      eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: session, error: null }) })),
    });

    const ft = mockSupabase.from("financial_transactions");
    ft.select.mockReturnValue({
      eq: vi.fn(() => ({ data: sessionTxns, error: null })),
      is: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn().mockResolvedValue({ data: orphanSales, error: null }),
          })),
        })),
      })),
    });
  }

  const baseSession = { opening_amount_ves: 10000, opening_amount_usd: 0, opened_at: "2026-09-01T10:00:00Z" };

  it("suma ventas y resta egresos por moneda", async () => {
    mockCalcEnv({
      session: baseSession,
      sessionTxns: [
        { id: "a", txn_type: "sale", currency: "VES", amount: 50000 },
        { id: "b", txn_type: "sale", currency: "VES", amount: 30000 },
        { id: "c", txn_type: "expense", currency: "VES", amount: 10000 },
        { id: "d", txn_type: "sale", currency: "USD", amount: 5 },
      ],
    });

    const { calculateExpectedAmounts } = await import("../core");

    const result = await calculateExpectedAmounts(mockSupabase, "sess-001");

    expect(result.expected_ves).toBe(80000);
    expect(result.expected_usd).toBe(5);
  });

  it("incluye ventas huérfanas del día aunque no haya sesión al cobrar", async () => {
    mockCalcEnv({
      session: { ...baseSession, closed_at: "2026-09-01T20:00:00Z" },
      orphanSales: [
        { id: "o1", txn_type: "sale", currency: "VES", amount: 40000, created_at: "2026-09-01T09:30:00Z" },
      ],
    });

    const { calculateExpectedAmounts } = await import("../core");

    const result = await calculateExpectedAmounts(mockSupabase, "sess-001");

    expect(result.expected_ves).toBe(50000);
    expect(result.orphanSaleIds).toEqual(["o1"]);
  });

  it("lanza error si la sesión no existe", async () => {
    const cs = mockSupabase.from("cash_sessions");
    cs.select.mockReturnValue({
      eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })),
    });

    const { calculateExpectedAmounts } = await import("../core");

    await expect(calculateExpectedAmounts(mockSupabase, "sess-none")).rejects.toThrow(
      "Sesión no encontrada"
    );
  });
});

describe("assignOrphanSalesToSession", () => {
  it("reasigna ventas huérfanas a la sesión que se cierra", async () => {
    const cs = mockSupabase.from("cash_sessions");
    cs.select.mockReturnValue({
      eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { opened_at: "2026-09-01T10:00:00Z", closed_at: "2026-09-01T20:00:00Z" }, error: null }) })),
    });

    const ft = mockSupabase.from("financial_transactions");
    ft.update.mockReturnValue({
      is: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    });

    const { assignOrphanSalesToSession } = await import("../core");

    await assignOrphanSalesToSession(mockSupabase, "sess-001");

    expect(ft.update).toHaveBeenCalledWith({ cash_session_id: "sess-001" });
  });

  it("lanza error si la sesión no existe", async () => {
    const cs = mockSupabase.from("cash_sessions");
    cs.select.mockReturnValue({
      eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })),
    });

    const { assignOrphanSalesToSession } = await import("../core");

    await expect(assignOrphanSalesToSession(mockSupabase, "sess-none")).rejects.toThrow(
      "Sesión no encontrada"
    );
  });
});
