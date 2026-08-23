import { z } from "zod";

export const categorySchema = z.object({
  name: z.object({
    es: z.string().min(1, "El nombre en español es requerido"),
    en: z.string().optional(),
  }).default({ es: "", en: "" }),
  description: z.object({
    es: z.string().optional(),
    en: z.string().optional(),
  }).default({ es: "", en: "" }),
  applies_to: z.enum(["product", "raw_material"], {
    errorMap: () => ({ message: "Debe seleccionar un tipo válido" }),
  }),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const categoryFormSchema = categorySchema.extend({
  name: z.object({
    es: z.string().min(1, "El nombre en español es requerido"),
    en: z.string().optional(),
  }),
  description: z.object({
    es: z.string().optional(),
    en: z.string().optional(),
  }),
  applies_to: z.enum(["product", "raw_material"]),
  sort_order: z.coerce.number().int().min(0).default(0),
});

