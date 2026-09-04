import { getBcvRate } from "@/lib/bcv";

/**
 * Obtiene la sesión de caja abierta actual.
 * @returns {Object|null} La sesión abierta o null.
 */
export async function getOpenCashSession(supabase) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("is_open", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Valida que exista una sesión de caja abierta para pagos en efectivo.
 * Para métodos no efectivos, retorna ok sin sesión.
 * @returns {{ ok: boolean, session?: Object, error?: string }}
 */
export async function validateCashSessionForPayment(supabase, isCashPayment) {
  if (!isCashPayment) {
    return { ok: true, session: null };
  }
  const session = await getOpenCashSession(supabase);
  if (!session) {
    return {
      ok: false,
      error: "No hay sesión de caja abierta. Abra una sesión antes de cobrar en efectivo.",
    };
  }
  return { ok: true, session };
}

/**
 * Crea una transacción financiera de tipo 'sale' asociada a una orden.
 * RB-04: guarda currency + exchange_rate como snapshot histórico.
 */
export async function createSaleTransaction(supabase, {
  orderId,
  cashSessionId,
  amount,
  currency,
  exchangeRate,
  userId,
}) {
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      txn_type: "sale",
      order_id: orderId,
      cash_session_id: cashSessionId || null,
      currency,
      amount,
      exchange_rate: exchangeRate,
      performed_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Genera una factura (invoices) a partir de una orden completada.
 * Crea un snapshot inmutable de los items y totales.
 * RB-06: la factura original nunca se modifica.
 * RB-04: usa el exchange_rate guardado en la orden (no re-fetch BCV).
 */
export async function createInvoiceFromOrder(supabase, { orderId, userId }) {
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", "invoice")
    .maybeSingle();

  if (existing) return existing;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`
      id, currency, exchange_rate, subtotal_ves, total_ves,
      order_items (
        id, quantity, unit_price_ves, unit_price_usd, notes,
        product:products(id, name),
        combo:combos(id, name),
        order_item_extras (
          id, quantity, unit_price_ves, extra:product_extras(id, name)
        )
      )
    `)
    .eq("id", orderId)
    .single();

  if (orderErr || !order) throw new Error(orderErr?.message || "Orden no encontrada");

  const itemsSnapshot = (order.order_items || []).map((item) => ({
    name: item.product?.name || item.combo?.name || "Item",
    quantity: item.quantity,
    unit_price_ves: item.unit_price_ves,
    unit_price_usd: item.unit_price_usd,
    extras: (item.order_item_extras || []).map((e) => ({
      name: e.extra?.name || "Extra",
      quantity: e.quantity,
      unit_price_ves: e.unit_price_ves,
    })),
  }));

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      order_id: orderId,
      type: "invoice",
      currency: order.currency || "VES",
      exchange_rate: order.exchange_rate || 1,
      subtotal: order.subtotal_ves || 0,
      tax_amount: 0,
      total: order.total_ves || 0,
      items_snapshot: itemsSnapshot,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Calcula el monto esperado al cierre de una sesión.
 * expected = opening_amount + SUM(sales) - SUM(expenses)
 * RB-04: usa los exchange_rate ya guardados en las transacciones.
 *
 * Incluye también las ventas "huérfanas" (cash_session_id IS NULL) creadas
 * dentro del período de la sesión (entre opened_at y closed_at/ahora). De esta
 * forma, ventas hechas antes de abrir caja (web/POS) sí se reflejan en el día.
 */
export async function calculateExpectedAmounts(supabase, sessionId) {
  const { data: session, error: sessErr } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessErr || !session) throw new Error("Sesión no encontrada");

  const windowStart = session.opened_at;
  const windowEnd = session.closed_at || new Date().toISOString();

  const { data: sessionTxns, error: txnErr } = await supabase
    .from("financial_transactions")
    .select("txn_type, currency, amount")
    .eq("cash_session_id", sessionId);

  if (txnErr) throw new Error(txnErr.message);

  // Ventas huérfanas dentro del período: se registran aunque no había sesión
  // abierta (orden web/POS cobrada antes de abrir caja).
  const { data: orphanSales, error: orphanErr } = await supabase
    .from("financial_transactions")
    .select("id, txn_type, currency, amount, created_at")
    .is("cash_session_id", null)
    .eq("txn_type", "sale")
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd);

  if (orphanErr) throw new Error(orphanErr.message);

  let totalVes = Number(session.opening_amount_ves) || 0;
  let totalUsd = Number(session.opening_amount_usd) || 0;

  const apply = (txns) => {
    for (const txn of txns || []) {
      const amt = Number(txn.amount);
      if (txn.currency === "VES") {
        if (txn.txn_type === "sale") totalVes += amt;
        else if (["expense", "capital_out", "supplier_payment"].includes(txn.txn_type)) totalVes -= amt;
      } else if (txn.currency === "USD") {
        if (txn.txn_type === "sale") totalUsd += amt;
        else if (["expense", "capital_out", "supplier_payment"].includes(txn.txn_type)) totalUsd -= amt;
      }
    }
  };

  apply(sessionTxns);
  apply(orphanSales);

  return {
    expected_ves: totalVes,
    expected_usd: totalUsd,
    // IDs de ventas huérfanas consideradas, para poder asignarlas al cerrar.
    orphanSaleIds: (orphanSales || []).map((t) => t.id),
  };
}

/**
 * Asigna las ventas huérfanas (sin sesión) a la sesión que se está cerrando,
 * para que queden "ancladas" a ese arqueo y no se cuenten dos veces en una
 * sesión futura. RB-04 no se altera: solo se vincula el cash_session_id.
 */
export async function assignOrphanSalesToSession(supabase, sessionId) {
  const { data: session, error: sessErr } = await supabase
    .from("cash_sessions")
    .select("opened_at, closed_at")
    .eq("id", sessionId)
    .single();

  if (sessErr || !session) throw new Error("Sesión no encontrada");

  const windowStart = session.opened_at;
  const windowEnd = session.closed_at || new Date().toISOString();

  const { error } = await supabase
    .from("financial_transactions")
    .update({ cash_session_id: sessionId })
    .is("cash_session_id", null)
    .eq("txn_type", "sale")
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd);

  if (error) throw new Error(error.message);
}

/**
 * Anula una factura creando una nota de crédito.
 * RB-06: la factura original NUNCA se modifica ni se borra.
 */
export async function voidInvoice(supabase, { invoiceId, reason, userId }) {
  const { data: original, error: origErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (origErr || !original) throw new Error("Factura no encontrada");
  if (original.type === "credit_note") throw new Error("No se puede anular una nota de crédito");

  const { data: existingCreditNote } = await supabase
    .from("invoices")
    .select("id")
    .eq("reference_invoice_id", invoiceId)
    .eq("type", "credit_note")
    .maybeSingle();

  if (existingCreditNote) {
    throw new Error("Esta factura ya fue anulada");
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      order_id: original.order_id,
      type: "credit_note",
      reference_invoice_id: invoiceId,
      currency: original.currency,
      exchange_rate: original.exchange_rate,
      subtotal: original.subtotal,
      tax_amount: original.tax_amount,
      total: original.total,
      items_snapshot: original.items_snapshot,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
