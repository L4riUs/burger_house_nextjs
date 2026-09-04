"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tableSchema } from "./schemas";

const PAGE_SIZE = 20;

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  return { supabase, user, role: profile?.role, error: null };
}

export async function listTables({
  page = 1, pageSize = PAGE_SIZE, search, status, zone, isVip,
} = {}) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  const { supabase, role } = auth;

  if (!["owner","admin","cajero","mesero","cocina","delivery"].includes(role)) {
    return { error: "No tienes permisos" };
  }

  let query = supabase
    .from("restaurant_tables")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (search) query = query.ilike("name", `%${search}%`);
  if (status) query = query.eq("status", status);
  if (zone) query = query.eq("zone", zone);
  if (isVip !== undefined && isVip !== "") query = query.eq("is_vip", isVip === "true" || isVip === true);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(from, to);

  if (error) return { error: error.message };

  return {
    data: data || [],
    pagination: {
      page, pageSize, total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function listAllTablesForMap() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  const { supabase, role } = auth;

  if (!["owner","admin","cajero","mesero","cocina","delivery"].includes(role)) {
    return { error: "No tienes permisos" };
  }

  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function getTable(id) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from("restaurant_tables").select("*").eq("id", id).is("deleted_at", null).single();

  if (error) return { error: error.message };
  return { data };
}

export async function createTable(formData) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin"].includes(auth.role)) return { error: "No tienes permisos" };

  const parsed = tableSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await auth.supabase
    .from("restaurant_tables")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/tables");
  return { data, success: "Mesa creada correctamente" };
}

export async function updateTable(id, formData) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin"].includes(auth.role)) return { error: "No tienes permisos" };

  const parsed = tableSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await auth.supabase
    .from("restaurant_tables")
    .update(parsed.data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/tables");
  return { data, success: "Mesa actualizada correctamente" };
}

export async function deleteTable(id) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin"].includes(auth.role)) return { error: "No tienes permisos" };

  const { error } = await auth.supabase
    .from("restaurant_tables")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/tables");
  return { success: "Mesa eliminada (movida a papelera)" };
}

export async function restoreTable(id) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin"].includes(auth.role)) return { error: "No tienes permisos" };

  const { error } = await auth.supabase
    .from("restaurant_tables")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/tables");
  return { success: "Mesa restaurada correctamente" };
}

export async function listDistinctZones() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from("restaurant_tables")
    .select("zone")
    .is("deleted_at", null)
    .not("zone", "is", null);

  if (error) return { error: error.message };

  const zones = [...new Set((data || []).map((r) => r.zone).filter(Boolean))];
  return { data: zones };
}
