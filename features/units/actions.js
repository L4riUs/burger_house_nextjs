"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { unitSchema } from "./schemas";

const PAGE_SIZE = 10;

export async function listUnits({
  page = 1,
  pageSize = PAGE_SIZE,
  unitType,
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
    .from("units")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (unitType) {
    query = query.eq("unit_type", unitType);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,abbreviation.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("unit_type", { ascending: true })
    .order("name", { ascending: true })
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

export async function getUnit(id) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function createUnit(formData) {
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
    return { error: "No tienes permisos para crear unidades" };
  }

  const parsed = unitSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  if (parsed.data.is_base_unit) {
    const { data: existingBase } = await supabase
      .from("units")
      .select("id")
      .eq("unit_type", parsed.data.unit_type)
      .eq("is_base_unit", true)
      .is("deleted_at", null)
      .single();

    if (existingBase) {
      return { error: `Ya existe una unidad base para el tipo ${parsed.data.unit_type}` };
    }
  }

  const { data, error } = await supabase
    .from("units")
    .insert({
      name: parsed.data.name,
      abbreviation: parsed.data.abbreviation,
      unit_type: parsed.data.unit_type,
      conversion_factor: parsed.data.conversion_factor,
      is_base_unit: parsed.data.is_base_unit,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/unidades");
  return { data, success: "Unidad creada correctamente" };
}

export async function updateUnit(id, formData) {
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
    return { error: "No tienes permisos para actualizar unidades" };
  }

  const parsed = unitSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  if (parsed.data.is_base_unit) {
    const { data: existingBase } = await supabase
      .from("units")
      .select("id")
      .eq("unit_type", parsed.data.unit_type)
      .eq("is_base_unit", true)
      .is("deleted_at", null)
      .neq("id", id)
      .single();

    if (existingBase) {
      return { error: `Ya existe una unidad base para el tipo ${parsed.data.unit_type}` };
    }
  }

  const { data, error } = await supabase
    .from("units")
    .update({
      name: parsed.data.name,
      abbreviation: parsed.data.abbreviation,
      unit_type: parsed.data.unit_type,
      conversion_factor: parsed.data.conversion_factor,
      is_base_unit: parsed.data.is_base_unit,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/unidades");
  return { data, success: "Unidad actualizada correctamente" };
}

export async function checkUnitUsage(unitId) {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("raw_materials")
    .select("*", { count: "exact", head: true })
    .eq("unit_id", unitId)
    .is("deleted_at", null);

  if (error) {
    return { error: error.message };
  }

  return { count: count || 0 };
}

export async function deleteUnit(unitId) {
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
    return { error: "No tienes permisos para eliminar unidades" };
  }

  const { count, error: countError } = await supabase
    .from("raw_materials")
    .select("*", { count: "exact", head: true })
    .eq("unit_id", unitId)
    .is("deleted_at", null);

  if (countError) {
    return { error: countError.message };
  }

  if (count > 0) {
    const { error: updateError } = await supabase
      .from("units")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", unitId);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath("/admin/inventario/unidades");
    revalidatePath("/admin/papelera");

    return {
      success: `Unidad eliminada (movida a papelera) - ${count} materia(s) prima(s) la están usando`,
      warning: true,
      softDeleted: true,
    };
  }

  const { error: deleteError } = await supabase
    .from("units")
    .delete()
    .eq("id", unitId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath("/admin/inventario/unidades");
  return { success: "Unidad eliminada permanentemente" };
}

export async function restoreUnit(id) {
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
    return { error: "No tienes permisos para restaurar unidades" };
  }

  const { error } = await supabase
    .from("units")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/unidades");
  revalidatePath("/admin/papelera");

  return { success: "Unidad restaurada correctamente" };
}