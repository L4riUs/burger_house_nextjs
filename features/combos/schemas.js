import { z } from "zod";

const comboItemSchema = z.object({
  product_id: z.string().uuid("Producto inválido"),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1"),
});

export const comboSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().nullable(),
  price_usd: z.coerce.number().min(0, "El precio USD no puede ser negativo"),
  image_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  combo_items: z.array(comboItemSchema).default([]),
}).refine(
  (data) => data.combo_items.length >= 1,
  {
    message: "Un combo debe tener al menos 1 producto",
    path: ["combo_items"],
  }
).refine(
  (data) => {
    const ids = data.combo_items.map((item) => item.product_id);
    return ids.length === new Set(ids).size;
  },
  {
    message: "No puede haber productos duplicados en el combo",
    path: ["combo_items"],
  }
);

export const comboFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().nullable(),
  price_usd: z.coerce.number().min(0, "El precio USD no puede ser negativo"),
  image_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  combo_items: z.array(comboItemSchema).default([]),
}).refine(
  (data) => data.combo_items.length >= 1,
  {
    message: "Un combo debe tener al menos 1 producto",
    path: ["combo_items"],
  }
).refine(
  (data) => {
    const ids = data.combo_items.map((item) => item.product_id);
    return ids.length === new Set(ids).size;
  },
  {
    message: "No puede haber productos duplicados en el combo",
    path: ["combo_items"],
  }
);
