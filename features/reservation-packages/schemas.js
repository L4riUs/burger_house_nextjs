import { z } from "zod";

const packageTableItemSchema = z.object({
  table_id: z.string().uuid("Mesa inválida"),
});

export const packageSchema = z.object({
  name: z.object({
    es: z.string().min(1, "El nombre en español es requerido"),
    en: z.string().optional(),
  }).default({ es: "", en: "" }),
  description: z.object({
    es: z.string().optional(),
    en: z.string().optional(),
  }).default({ es: "", en: "" }),
  price_usd: z.coerce.number().min(0, "El precio USD no puede ser negativo"),
  capacity: z.coerce.number().int().min(1, "La capacidad debe ser al menos 1"),
  package_tables: z.array(packageTableItemSchema).default([]),
}).refine(
  (data) => data.package_tables.length >= 1,
  { message: "Un paquete debe incluir al menos 1 mesa", path: ["package_tables"] },
).refine(
  (data) => {
    const ids = data.package_tables.map((t) => t.table_id);
    return ids.length === new Set(ids).size;
  },
  { message: "No puede haber mesas duplicadas en el paquete", path: ["package_tables"] },
);