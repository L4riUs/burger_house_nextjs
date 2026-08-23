"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rawMaterialSchema } from "./schemas";

const PAGE_SIZE = 10;

export async function listRawMaterials({
  page = 1,
  pageSize = PAGE_SIZE,
  categoryId,
  search,
  lowStock,
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
    .from("raw_materials")
    .select(`
      *,
      category:categories(id, name),
      unit:units(id, name, abbreviation),
      primary_supplier:suppliers(id, name)
    `, { count: "exact" })
    .is("deleted_at", null);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    return { error: error.message };
  }

  let materials = data || [];

  if (lowStock) {
    const { data: stockData } = await supabase
      .from("current_stock")
      .select("item_id, stock")
      .eq("item_type", "raw_material")
      .in("item_id", materials.map(m => m.id));

    const stockMap = new Map(stockData?.map(s => [s.item_id, s.stock]) || []);
    
    materials = materials.filter(m => {
      const currentStock = stockMap.get(m.id) || 0;
      return currentStock < (m.min_stock || 0);
    });
  }

  return {
    data: materials,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function getRawMaterial(id) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("raw_materials")
    .select(`
      *,
      category:categories(id, name),
      unit:units(id, name, abbreviation),
      primary_supplier:suppliers(id, name)
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  const { data: stockData } = await supabase
    .from("current_stock")
    .select("stock")
    .eq("item_type", "raw_material")
    .eq("item_id", id)
    .single();

  return { data: { ...data, current_stock: stockData?.stock || 0 } };
}

export async function listCategoriesForRawMaterials() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("applies_to", "raw_material")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function listUnits() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("units")
    .select("id, name, abbreviation")
    .is("deleted_at", null)
    .order("unit_type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function listSuppliers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function createRawMaterial(formData) {
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
    return { error: "No tienes permisos para crear materias primas" };
  }

  const parsed = rawMaterialSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("raw_materials")
    .insert({
      name: parsed.data.name,
      category_id: parsed.data.category_id,
      unit_id: parsed.data.unit_id,
      min_stock: parsed.data.min_stock,
      average_cost: parsed.data.average_cost,
      primary_supplier_id: parsed.data.primary_supplier_id || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/materias-primas");
  return { data, success: "Materia prima creada correctamente" };
}

export async function updateRawMaterial(id, formData) {
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
    return { error: "No tienes permisos para actualizar materias primas" };
  }

  const parsed = rawMaterialSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("raw_materials")
    .update({
      name: parsed.data.name,
      category_id: parsed.data.category_id,
      unit_id: parsed.data.unit_id,
      min_stock: parsed.data.min_stock,
      average_cost: parsed.data.average_cost,
      primary_supplier_id: parsed.data.primary_supplier_id || null,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/materias-primas");
  return { data, success: "Materia prima actualizada correctamente" };
}

export async function deleteRawMaterial(id) {
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
    return { error: "No tienes permisos para eliminar materias primas" };
  }

  const { error } = await supabase
    .from("raw_materials")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/materias-primas");
  revalidatePath("/admin/papelera");

  return { success: "Materia prima eliminada (movida a papelera)" };
}

export async function restoreRawMaterial(id) {
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
    return { error: "No tienes permisos para restaurar materias primas" };
  }

  const { error } = await supabase
    .from("raw_materials")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/materias-primas");
  revalidatePath("/admin/papelera");

  return { success: "Materia prima restaurada correctamente" };
}