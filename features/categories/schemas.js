import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().default(""),
  applies_to: z.enum(["product", "raw_material"], {
    errorMap: () => ({ message: "Debe seleccionar un tipo válido" }),
  }),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const categoryFormSchema = categorySchema;

