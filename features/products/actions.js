"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "./schemas";
import { getBcvRate } from "@/lib/bcv";

const PAGE_SIZE = 10;

export async function listProducts({
  page = 1,
  pageSize = PAGE_SIZE,
  categoryId,
  productType,
  search,
} = {}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!actorProfile || !["owner", "admin", "cajero", "mesero", "cocina"].includes(actorProfile.role)) {
    return { error: "No tienes permisos para ver esta información" };
  }

  let query = supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name)
    `,
      { count: "exact" }
    )
    .is("deleted_at", null);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (productType) {
    query = query.eq("product_type", productType);
  }

  if (search) {
    query = query.or(`name->>es.ilike.%${search}%,name->>en.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("name->>es", { ascending: true })
    .range(from, to);

  if (error) {
    return { error: error.message };
  }

  let products = data || [];

  const retailIds = products
    .filter((p) => p.product_type === "retail")
    .map((p) => p.id);

  if (retailIds.length > 0) {
    const { data: stockData } = await supabase
      .from("current_stock")
      .select("item_id, stock")
      .eq("item_type", "product")
      .in("item_id", retailIds);

    const stockMap = new Map(stockData?.map((s) => [s.item_id, s.stock]) || []);
    products = products.map((p) => ({
      ...p,
      current_stock: stockMap.get(p.id) || 0,
    }));
  }

  return {
    data: products,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function getProduct(id) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name),
      recipe_items(
        id,
        quantity,
        raw_material:raw_materials(id, name, unit:units(id, name, abbreviation))
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  if (data.product_type === "retail") {
    const { data: stockData } = await supabase
      .from("current_stock")
      .select("stock")
      .eq("item_type", "product")
      .eq("item_id", id)
      .single();

    data.current_stock = stockData?.stock || 0;
  }

  return { data };
}

export async function listCategoriesForProducts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("applies_to", "product")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function listRawMaterialsForRecipe() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("raw_materials")
    .select(`
      id,
      name,
      unit:units(id, name, abbreviation)
    `)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function createProduct(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!actorProfile || !["owner", "admin"].includes(actorProfile.role)) {
    return { error: "No tienes permisos para crear productos" };
  }

  const parsed = productSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { recipe_items, ...productData } = parsed.data;

  let price_ves = 0;
  try {
    const bcvRate = await getBcvRate();
    price_ves = Math.round(productData.price_usd * bcvRate * 100) / 100;
  } catch (err) {
    return { error: "Error calculando precio en VES: " + err.message };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      product_type: productData.product_type,
      category_id: productData.category_id,
      name: productData.name,
      description: productData.description,
      price_usd: productData.price_usd,
      price_ves: price_ves,
      image_url: productData.image_url,
      is_active: productData.is_active,
      is_sold_out: productData.is_sold_out,
      min_stock: productData.min_stock,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  if (productData.product_type === "prepared" && recipe_items.length > 0) {
    const recipeInserts = recipe_items.map((item) => ({
      product_id: data.id,
      raw_material_id: item.raw_material_id,
      quantity: item.quantity,
    }));

    const { error: recipeError } = await supabase
      .from("recipe_items")
      .insert(recipeInserts);

    if (recipeError) {
      await supabase.from("products").delete().eq("id", data.id);
      return { error: recipeError.message };
    }
  }

  revalidatePath("/admin/productos");
  return { data, success: "Producto creado correctamente" };
}

export async function updateProduct(id, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!actorProfile || !["owner", "admin"].includes(actorProfile.role)) {
    return { error: "No tienes permisos para actualizar productos" };
  }

  const parsed = productSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { recipe_items, ...productData } = parsed.data;

  let price_ves = 0;
  try {
    const bcvRate = await getBcvRate();
    price_ves = Math.round(productData.price_usd * bcvRate * 100) / 100;
  } catch (err) {
    return { error: "Error calculando precio en VES: " + err.message };
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      product_type: productData.product_type,
      category_id: productData.category_id,
      name: productData.name,
      description: productData.description,
      price_usd: productData.price_usd,
      price_ves: price_ves,
      image_url: productData.image_url,
      is_active: productData.is_active,
      is_sold_out: productData.is_sold_out,
      min_stock: productData.min_stock,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  if (productData.product_type === "prepared") {
    await supabase.from("recipe_items").delete().eq("product_id", id);

    if (recipe_items.length > 0) {
      const recipeInserts = recipe_items.map((item) => ({
        product_id: id,
        raw_material_id: item.raw_material_id,
        quantity: item.quantity,
      }));

      const { error: recipeError } = await supabase
        .from("recipe_items")
        .insert(recipeInserts);

      if (recipeError) {
        return { error: recipeError.message };
      }
    }
  }

  revalidatePath("/admin/productos");
  return { data, success: "Producto actualizado correctamente" };
}

export async function deleteProduct(id) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!actorProfile || !["owner", "admin"].includes(actorProfile.role)) {
    return { error: "No tienes permisos para eliminar productos" };
  }

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/productos");
  revalidatePath("/admin/papelera");

  return { success: "Producto eliminado (movido a papelera)" };
}

export async function restoreProduct(id) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!actorProfile || !["owner", "admin"].includes(actorProfile.role)) {
    return { error: "No tienes permisos para restaurar productos" };
  }

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/productos");
  revalidatePath("/admin/papelera");

  return { success: "Producto restaurado correctamente" };
}
