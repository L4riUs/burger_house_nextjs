import { z } from "zod";

export const rawMaterialSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  category_id: z.string().uuid("Categoría inválida"),
  unit_id: z.string().uuid("Unidad inválida"),
  min_stock: z.coerce.number().min(0, "El stock mínimo no puede ser negativo").default(0),
  average_cost: z.coerce.number().min(0, "El costo promedio no puede ser negativo").default(0),
  primary_supplier_id: z.string().uuid().nullable().optional(),
});

export const rawMaterialFormSchema = rawMaterialSchema.extend({
  name: z.string().min(1, "El nombre es requerido"),
  category_id: z.string().uuid("Debe seleccionar una categoría"),
  unit_id: z.string().uuid("Debe seleccionar una unidad"),
  min_stock: z.coerce.number().min(0, "El stock mínimo no puede ser negativo").default(0),
  average_cost: z.coerce.number().min(0, "El costo promedio no puede ser negativo").default(0),
  primary_supplier_id: z.string().uuid().nullable().optional(),
});

