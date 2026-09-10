import { z } from "zod";

export const exportReportSchema = z.object({
  report_type: z.enum(["sales", "inventory", "cash"]),
  format: z.enum(["csv", "pdf"]),
  date_from: z.string().datetime({ offset: true }).optional().nullable(),
  date_to: z.string().datetime({ offset: true }).optional().nullable(),
  item_type: z.enum(["raw_material", "product"]).optional().nullable(),
  txn_type: z.enum(["sale", "expense", "capital_in", "capital_out", "supplier_payment"]).optional().nullable(),
  preset: z.enum(["today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month", "custom"]).optional(),
});