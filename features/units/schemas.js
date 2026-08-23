import { z } from "zod";

export const unitSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  abbreviation: z.string().min(1, "La abreviatura es requerida"),
  unit_type: z.enum(["mass", "volume", "count"], {
    errorMap: () => ({ message: "Tipo de unidad inválido" }),
  }),
  conversion_factor: z.coerce.number().positive("El factor de conversión debe ser mayor a 0").default(1),
  is_base_unit: z.boolean().default(false),
});

export const unitFormSchema = unitSchema.extend({
  name: z.string().min(1, "El nombre es requerido"),
  abbreviation: z.string().min(1, "La abreviatura es requerida"),
  unit_type: z.enum(["mass", "volume", "count"]),
  conversion_factor: z.coerce.number().positive("El factor de conversión debe ser mayor a 0").default(1),
  is_base_unit: z.boolean().default(false),
});

