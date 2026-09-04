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

describe("RB-01/RB-04: Cálculo de monto esperado al cierre de caja", () => {
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

  it("expected = opening + ventas − egresos, por moneda", async () => {
    mockCalcEnv({
      session: baseSession,
      sessionTxns: [
        { id: "a", txn_type: "sale", currency: "VES", amount: 50000 },
        { id: "b", txn_type: "sale", currency: "VES", amount: 30000 },
        { id: "c", txn_type: "expense", currency: "VES", amount: 10000 },
        { id: "d", txn_type: "capital_out", currency: "VES", amount: 5000 },
        { id: "e", txn_type: "sale", currency: "USD", amount: 5 },
      ],
    });

    const { calculateExpectedAmounts } = await import("../core");

    const result = await calculateExpectedAmounts(mockSupabase, "sess-001");

    expect(result.expected_ves).toBe(75000);
    expect(result.expected_usd).toBe(5);
  });

  it("no recalcula tasa pasada: usa los montos ya guardados en la sesión", async () => {
    mockCalcEnv({
      session: baseSession,
      sessionTxns: [{ id: "a", txn_type: "sale", currency: "VES", amount: 10000 }],
    });

    const { calculateExpectedAmounts } = await import("../core");

    const result = await calculateExpectedAmounts(mockSupabase, "sess-001");

    // No se consulta BCV en ningún momento durante el cálculo
    expect(result.expected_ves).toBe(20000);
  });
});
