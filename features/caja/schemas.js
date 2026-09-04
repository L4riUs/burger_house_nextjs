import { z } from "zod";

export const currencySchema = z.enum(["VES", "USD"]);

export const paymentMethodSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  currency: currencySchema,
  provider_code: z.string().optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export const openCashSessionSchema = z.object({
  opening_amount_ves: z.coerce.number().min(0, "El monto no puede ser negativo"),
  opening_amount_usd: z.coerce.number().min(0, "El monto no puede ser negativo"),
});

export const closeCashSessionSchema = z.object({
  session_id: z.string().uuid(),
  counted_amount_ves: z.coerce.number(),
  counted_amount_usd: z.coerce.number(),
});

const emptyToNull = (v) => (v === "" || v === null || v === undefined ? null : v);

export const createTransactionSchema = z.object({
  txn_type: z.enum(["expense", "capital_in", "capital_out", "supplier_payment"]),
  currency: currencySchema,
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  description: z.string().min(1, "La descripción es requerida"),
  cash_session_id: z.preprocess(emptyToNull, z.string().uuid().optional().nullable()),
  supplier_id: z.preprocess(emptyToNull, z.string().uuid().optional().nullable()),
}).refine(
  (data) => {
    if (data.txn_type === "supplier_payment") {
      return !!data.supplier_id;
    }
    return true;
  },
  { message: "El proveedor es requerido para pagos a proveedores", path: ["supplier_id"] }
).refine(
  (data) => {
    if (data.txn_type === "expense") {
      return !!data.cash_session_id;
    }
    return true;
  },
  { message: "La sesión de caja es requerida para registrar gastos", path: ["cash_session_id"] }
);

export const createCreditNoteSchema = z.object({
  invoice_id: z.string().uuid(),
  reason: z.string().min(1, "El motivo de anulación es requerido"),
});

export const listTransactionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  txn_type: z.enum(["sale", "expense", "capital_in", "capital_out", "supplier_payment"]).optional(),
  cash_session_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const listInvoicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["invoice", "credit_note"]).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
});

export const listCashSessionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});
