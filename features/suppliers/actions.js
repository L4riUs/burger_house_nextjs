"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema } from "./schemas";

const PAGE_SIZE = 10;

export async function listSuppliers({
  page = 1,
  pageSize = PAGE_SIZE,
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

  if (!actorProfile || !["owner", "admin", "cajero"].includes(actorProfile.role)) {
    return { error: "No tienes permisos para ver esta información" };
  }

  let query = supabase
    .from("suppliers")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
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

export async function getSupplier(id) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function createSupplier(formData) {
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
    return { error: "No tienes permisos para crear proveedores" };
  }

  const parsed = supplierSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: parsed.data.name,
      tax_id: parsed.data.tax_id,
      contact_name: parsed.data.contact_name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      notes: parsed.data.notes,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/proveedores");
  return { data, success: "Proveedor creado correctamente" };
}

export async function updateSupplier(id, formData) {
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
    return { error: "No tienes permisos para actualizar proveedores" };
  }

  const parsed = supplierSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("suppliers")
    .update({
      name: parsed.data.name,
      tax_id: parsed.data.tax_id,
      contact_name: parsed.data.contact_name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      notes: parsed.data.notes,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/proveedores");
  return { data, success: "Proveedor actualizado correctamente" };
}

export async function deleteSupplier(id) {
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
    return { error: "No tienes permisos para eliminar proveedores" };
  }

  const { count, error: countError } = await supabase
    .from("raw_materials")
    .select("*", { count: "exact", head: true })
    .eq("primary_supplier_id", id)
    .is("deleted_at", null);

  if (countError) {
    return { error: countError.message };
  }

  if (count > 0) {
    const { error: updateError } = await supabase
      .from("suppliers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath("/admin/proveedores");
    revalidatePath("/admin/papelera");

    return {
      success: `Proveedor eliminado (movido a papelera) - ${count} materia(s) prima(s) lo tienen como proveedor principal`,
      warning: true,
      softDeleted: true,
    };
  }

  const { error: deleteError } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath("/admin/proveedores");
  return { success: "Proveedor eliminado permanentemente" };
}

export async function restoreSupplier(id) {
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
    return { error: "No tienes permisos para restaurar proveedores" };
  }

  const { error } = await supabase
    .from("suppliers")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/proveedores");
  revalidatePath("/admin/papelera");

  return { success: "Proveedor restaurado correctamente" };
}