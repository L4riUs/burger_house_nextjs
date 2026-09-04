"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBcvRate } from "@/lib/bcv";
import {
  paymentMethodSchema,
  openCashSessionSchema,
  closeCashSessionSchema,
  createTransactionSchema,
  createCreditNoteSchema,
  listTransactionsSchema,
  listInvoicesSchema,
  listCashSessionsSchema,
} from "./schemas";
import {
  getOpenCashSession,
  calculateExpectedAmounts,
  assignOrphanSalesToSession,
  voidInvoice as coreVoidInvoice,
  createSaleTransaction,
  createInvoiceFromOrder,
} from "./core";

async function getCurrentUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

async function getCurrentUserRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  return profile?.role;
}

function requireStaff(role) {
  return ["owner", "admin", "cajero"].includes(role);
}

function requireAdmin(role) {
  return ["owner", "admin"].includes(role);
}

// ---------------------------------------------------------------------------
// Payment Methods CRUD
// ---------------------------------------------------------------------------

export async function listPaymentMethods() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error) return { error: error.message };
  return { data };
}

export async function createPaymentMethod(formData) {
  const userRole = await getCurrentUserRole();
  if (!userRole || !requireAdmin(userRole)) {
    return { error: "No tienes permisos para gestionar métodos de pago" };
  }

  const parsed = paymentMethodSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/caja/metodos-pago");
  return { success: "Método de pago creado", data };
}

export async function updatePaymentMethod(formData) {
  const userRole = await getCurrentUserRole();
  if (!userRole || !requireAdmin(userRole)) {
    return { error: "No tienes permisos para gestionar métodos de pago" };
  }

  const parsed = paymentMethodSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, ...updates } = parsed.data;
  if (!id) return { error: "ID requerido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_methods")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/caja/metodos-pago");
  return { success: "Método de pago actualizado" };
}

export async function deletePaymentMethod(id) {
  const userRole = await getCurrentUserRole();
  if (!userRole || !requireAdmin(userRole)) {
    return { error: "No tienes permisos para eliminar métodos de pago" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_methods")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/caja/metodos-pago");
  return { success: "Método de pago eliminado" };
}

export async function togglePaymentMethodActive(id) {
  const userRole = await getCurrentUserRole();
  if (!userRole || !requireAdmin(userRole)) {
    return { error: "No tienes permisos" };
  }

  const supabase = await createClient();
  const { data: method } = await supabase
    .from("payment_methods")
    .select("is_active")
    .eq("id", id)
    .single();

  if (!method) return { error: "Método de pago no encontrado" };

  const { error } = await supabase
    .from("payment_methods")
    .update({ is_active: !method.is_active })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/caja/metodos-pago");
  return { success: method.is_active ? "Método desactivado" : "Método activado" };
}

// ---------------------------------------------------------------------------
// Cash Sessions
// ---------------------------------------------------------------------------

export async function openCashSession(formData) {
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();
  if (!userId || !userRole || !requireStaff(userRole)) {
    return { error: "No tienes permisos para abrir caja" };
  }

  const parsed = openCashSessionSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const existing = await getOpenCashSession(supabase);
  if (existing) {
    return {
      error: "Ya existe una sesión de caja abierta. Debe cerrarla antes de abrir una nueva.",
    };
  }

  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({
      opened_by: userId,
      opening_amount_ves: parsed.data.opening_amount_ves,
      opening_amount_usd: parsed.data.opening_amount_usd,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/caja");
  revalidatePath("/admin/caja/sesion");
  return { success: "Sesión de caja abierta", data };
}

export async function closeCashSession(formData) {
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();
  if (!userId || !userRole || !requireStaff(userRole)) {
    return { error: "No tienes permisos para cerrar caja" };
  }

  const parsed = closeCashSessionSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: session } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("id", parsed.data.session_id)
    .eq("is_open", true)
    .single();

  if (!session) {
    return { error: "Sesión no encontrada o ya cerrada" };
  }

  const expected = await calculateExpectedAmounts(supabase, parsed.data.session_id);

  // Opción A: anclar las ventas huérfanas (web/POS cobradas sin caja abierta)
  // a esta sesión para que no se cuenten dos veces en una sesión futura.
  await assignOrphanSalesToSession(supabase, parsed.data.session_id);

  const { error } = await supabase
    .from("cash_sessions")
    .update({
      expected_amount_ves: expected.expected_ves,
      expected_amount_usd: expected.expected_usd,
      counted_amount_ves: parsed.data.counted_amount_ves,
      counted_amount_usd: parsed.data.counted_amount_usd,
      closed_by: userId,
      closed_at: new Date().toISOString(),
      is_open: false,
    })
    .eq("id", parsed.data.session_id);

  if (error) return { error: error.message };
  revalidatePath("/admin/caja");
  revalidatePath("/admin/caja/sesion");
  return {
    success: "Sesión de caja cerrada",
    expected: expected.expected_ves,
    counted: parsed.data.counted_amount_ves,
    difference_ves: parsed.data.counted_amount_ves - expected.expected_ves,
    difference_usd: parsed.data.counted_amount_usd - expected.expected_usd,
  };
}

export async function getCurrentOpenSession() {
  const supabase = await createClient();
  const session = await getOpenCashSession(supabase);
  return { data: session };
}

export async function calculateExpectedAmountsForSession(sessionId) {
  const userRole = await getCurrentUserRole();
  if (!requireStaff(userRole)) {
    return { error: "No tienes permisos para consultar el arqueo de caja" };
  }
  const supabase = await createClient();
  try {
    const expected = await calculateExpectedAmounts(supabase, sessionId);
    return { data: expected };
  } catch (err) {
    return { error: err.message };
  }
}

export async function listCashSessions(filters = {}) {
  const parsed = listCashSessionsSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { page, pageSize, date_from, date_to } = parsed.data;
  const supabase = await createClient();

  let query = supabase
    .from("cash_sessions")
    .select(`
      *,
      opened_by_profile:profiles!cash_sessions_opened_by_fkey(full_name),
      closed_by_profile:profiles!cash_sessions_closed_by_fkey(full_name)
    `, { count: "exact" })
    .order("opened_at", { ascending: false });

  if (date_from) query = query.gte("opened_at", date_from);
  if (date_to) query = query.lte("opened_at", date_to + "T23:59:59");

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) return { error: error.message };

  return {
    data,
    pagination: {
      total: count,
      totalPages: Math.ceil(count / pageSize),
      page,
      pageSize,
    },
  };
}

// ---------------------------------------------------------------------------
// Financial Transactions
// ---------------------------------------------------------------------------

export async function createFinancialTransaction(formData) {
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();
  if (!userId || !userRole || !requireStaff(userRole)) {
    return { error: "No tienes permisos para registrar movimientos" };
  }

  const parsed = createTransactionSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(", ") };
  }

  const supabase = await createClient();

  const { getBcvRate: getRate } = await import("@/lib/bcv");
  let exchangeRate;
  try {
    exchangeRate = await getRate();
  } catch {
    exchangeRate = 1;
  }

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      ...parsed.data,
      exchange_rate: exchangeRate,
      performed_by: userId,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/caja/movimientos");
  revalidatePath("/admin/caja");
  return { success: "Movimiento registrado", data };
}

export async function listFinancialTransactions(filters = {}) {
  const parsed = listTransactionsSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { page, pageSize, txn_type, cash_session_id, date_from, date_to } = parsed.data;
  const supabase = await createClient();

  let query = supabase
    .from("financial_transactions")
    .select(`
      *,
      performed_by_profile:profiles!financial_transactions_performed_by_fkey(full_name)
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  if (txn_type) query = query.eq("txn_type", txn_type);
  if (cash_session_id) query = query.eq("cash_session_id", cash_session_id);
  if (date_from) query = query.gte("created_at", date_from);
  if (date_to) query = query.lte("created_at", date_to + "T23:59:59");

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) return { error: error.message };

  return {
    data,
    pagination: {
      total: count,
      totalPages: Math.ceil(count / pageSize),
      page,
      pageSize,
    },
  };
}

export async function getCapitalReport() {
  const supabase = await createClient();

  const { data: capitalIn } = await supabase
    .from("financial_transactions")
    .select("currency, amount")
    .eq("txn_type", "capital_in");

  const { data: capitalOut } = await supabase
    .from("financial_transactions")
    .select("currency, amount")
    .eq("txn_type", "capital_out");

  let totalInVes = 0, totalInUsd = 0;
  for (const txn of capitalIn || []) {
    if (txn.currency === "VES") totalInVes += Number(txn.amount);
    else totalInUsd += Number(txn.amount);
  }

  let totalOutVes = 0, totalOutUsd = 0;
  for (const txn of capitalOut || []) {
    if (txn.currency === "VES") totalOutVes += Number(txn.amount);
    else totalOutUsd += Number(txn.amount);
  }

  return {
    data: {
      capital_in_ves: totalInVes,
      capital_in_usd: totalInUsd,
      capital_out_ves: totalOutVes,
      capital_out_usd: totalOutUsd,
      balance_ves: totalInVes - totalOutVes,
      balance_usd: totalInUsd - totalOutUsd,
    },
  };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function listInvoices(filters = {}) {
  const parsed = listInvoicesSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { page, pageSize, type, date_from, date_to, search } = parsed.data;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select(`
      *,
      order:orders(id, order_number, channel)
    `, { count: "exact" })
    .order("issued_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (date_from) query = query.gte("issued_at", date_from);
  if (date_to) query = query.lte("issued_at", date_to + "T23:59:59");
  if (search) {
    query = query.or(`invoice_number.eq.${isNaN(search) ? 0 : search}`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) return { error: error.message };

  return {
    data,
    pagination: {
      total: count,
      totalPages: Math.ceil(count / pageSize),
      page,
      pageSize,
    },
  };
}

export async function getInvoiceById(id) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      order:orders(id, order_number, channel, profile:profiles!orders_profile_id_fkey(full_name), guest_customer:guest_customers(full_name)),
      credit_notes:invoices!reference_invoice_id(id, invoice_number, issued_at)
    `)
    .eq("id", id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function voidInvoiceAction(formData) {
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();
  if (!userId || !userRole || !requireAdmin(userRole)) {
    return { error: "No tienes permisos para anular facturas" };
  }

  const parsed = createCreditNoteSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  try {
    const creditNote = await coreVoidInvoice(supabase, {
      invoiceId: parsed.data.invoice_id,
      reason: parsed.data.reason,
      userId,
    });
    revalidatePath("/admin/caja/facturas");
    return { success: "Factura anulada. Nota de crédito generada.", data: creditNote };
  } catch (err) {
    return { error: err.message };
  }
}

export async function getLatestInvoiceForOrder(orderId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, type, total, currency")
    .eq("order_id", orderId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data };
}
