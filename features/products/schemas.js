import { z } from "zod";

const recipeItemSchema = z.object({
  raw_material_id: z.string().uuid("Materia prima inválida"),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
});

export const productSchema = z.object({
  product_type: z.enum(["prepared", "retail"]),
  category_id: z.string().uuid("Categoría inválida"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().nullable(),
  price_usd: z.coerce.number().min(0, "El precio USD no puede ser negativo"),
  image_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  is_sold_out: z.boolean().default(false),
  min_stock: z.coerce.number().min(0, "El stock mínimo no puede ser negativo").default(0),
  recipe_items: z.array(recipeItemSchema).default([]),
}).refine(
  (data) => {
    if (data.product_type === "prepared") {
      return data.recipe_items.length >= 1;
    }
    return true;
  },
  {
    message: "Un producto preparado debe tener al menos 1 materia prima en su receta",
    path: ["recipe_items"],
  }
).refine(
  (data) => {
    const ids = data.recipe_items.map((item) => item.raw_material_id);
    return ids.length === new Set(ids).size;
  },
  {
    message: "No puede haber materias primas duplicadas en la receta",
    path: ["recipe_items"],
  }
);

export const productFormSchema = z.object({
  product_type: z.enum(["prepared", "retail"], {
    required_error: "Debe seleccionar un tipo de producto",
  }),
  category_id: z.string().uuid("Debe seleccionar una categoría"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().nullable(),
  price_usd: z.coerce.number().min(0, "El precio USD no puede ser negativo"),
  image_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  is_sold_out: z.boolean().default(false),
  min_stock: z.coerce.number().min(0, "El stock mínimo no puede ser negativo").default(0),
  recipe_items: z.array(recipeItemSchema).default([]),
}).refine(
  (data) => {
    if (data.product_type === "prepared") {
      return data.recipe_items.length >= 1;
    }
    return true;
  },
  {
    message: "Un producto preparado debe tener al menos 1 materia prima en su receta",
    path: ["recipe_items"],
  }
).refine(
  (data) => {
    const ids = data.recipe_items.map((item) => item.raw_material_id);
    return ids.length === new Set(ids).size;
  },
  {
    message: "No puede haber materias primas duplicadas en la receta",
    path: ["recipe_items"],
  }
);
