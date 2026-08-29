"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "./schemas";

const PAGE_SIZE = 10;

export async function listCategories({
  page = 1,
  pageSize = PAGE_SIZE,
  appliesTo,
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
    .from("categories")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (appliesTo) {
    query = query.eq("applies_to", appliesTo);
  }

  if (search) {
    query = query.or(`name->>es.ilike.%${search}%,description->>es.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { error: error.message };
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function getCategory(id) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function createCategory(formData) {
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
    return { error: "No tienes permisos para crear categorías" };
  }

  const parsed = categorySchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description,
      applies_to: parsed.data.applies_to,
      sort_order: parsed.data.sort_order,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/categorias");
  return { data, success: "Categoría creada correctamente" };
}

export async function updateCategory(id, formData) {
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
    return { error: "No tienes permisos para actualizar categorías" };
  }

  const parsed = categorySchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      applies_to: parsed.data.applies_to,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/categorias");
  return { data, success: "Categoría actualizada correctamente" };
}

export async function deleteCategory(id) {
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
    return { error: "No tienes permisos para eliminar categorías" };
  }

  const { data: category, error: fetchError } = await supabase
    .from("categories")
    .select("id, applies_to")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchError || !category) {
    return { error: "Categoría no encontrada" };
  }

  let relatedTable = category.applies_to === "product" ? "products" : "raw_materials";

  const { count, error: countError } = await supabase
    .from(relatedTable)
    .select("*", { count: "exact", head: true })
    .eq("category_id", id)
    .is("deleted_at", null);

  if (countError) {
    return { error: countError.message };
  }

  const { error: updateError } = await supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/admin/inventario/categorias");
  revalidatePath("/admin/papelera");

  return {
    success: `Categoría eliminada (movida a papelera)${count > 0 ? ` - ${count} ${relatedTable === "products" ? "productos" : "materias primas"} quedarán sin categoría` : ""}`,
    warning: count > 0,
  };
}

export async function restoreCategory(id) {
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
    return { error: "No tienes permisos para restaurar categorías" };
  }

  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/categorias");
  revalidatePath("/admin/papelera");

  return { success: "Categoría restaurada correctamente" };
}