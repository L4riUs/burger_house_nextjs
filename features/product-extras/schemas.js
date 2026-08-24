import { z } from "zod";

export const productExtraSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price_usd: z.coerce.number().min(0, "El precio USD no puede ser negativo"),
  raw_material_id: z.string().uuid().nullable().optional(),
  raw_material_quantity: z.coerce.number().positive().nullable().optional(),
  product_ids: z.array(z.string().uuid()).default([]),
}).refine(
  (data) => {
    if (data.raw_material_id && !data.raw_material_quantity) {
      return false;
    }
    return true;
  },
  {
    message: "Si selecciona una materia prima, la cantidad es requerida",
    path: ["raw_material_quantity"],
  }
);

export const productExtraFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price_usd: z.coerce.number().min(0, "El precio USD no puede ser negativo"),
  raw_material_id: z.string().uuid().nullable().optional(),
  raw_material_quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0").nullable().optional(),
  product_ids: z.array(z.string().uuid()).default([]),
}).refine(
  (data) => {
    if (data.raw_material_id && !data.raw_material_quantity) {
      return false;
    }
    return true;
  },
  {
    message: "Si selecciona una materia prima, la cantidad es requerida",
    path: ["raw_material_quantity"],
  }
);
