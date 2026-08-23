import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  tax_id: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const supplierFormSchema = supplierSchema.extend({
  name: z.string().min(1, "El nombre es requerido"),
  tax_id: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});