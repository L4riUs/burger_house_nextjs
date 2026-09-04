"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { packageSchema } from "./schemas";
import { getBcvRate } from "@/lib/bcv";

const PAGE_SIZE = 10;

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "No autenticado" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, role: profile?.role, error: null };
}

export async function listPackages({ page = 1, pageSize = PAGE_SIZE, search } = {}) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  const { supabase, role } = auth;

  if (!["owner","admin","cajero","mesero"].includes(role)) {
    return { error: "No tienes permisos" };
  }

  let query = supabase
    .from("reservation_packages")
    .select("*, package_tables:reservation_package_tables(table:restaurant_tables(id, name, capacity))", { count: "exact" })
    .is("deleted_at", null);

  if (search) query = query.or(`name->>es.ilike.%${search}%,description->>es.ilike.%${search}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("name->>es", { ascending: true })
    .range(from, to);

  if (error) return { error: error.message };
  return {
    data: data || [],
    pagination: { page, pageSize, total: count || 0, totalPages: Math.ceil((count || 0) / pageSize) },
  };
}

export async function getPackage(id) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from("reservation_packages")
    .select("*, package_tables:reservation_package_tables(table_id)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) return { error: error.message };
  return {
    data: {
      ...data,
      package_tables: data.package_tables?.map((pt) => ({ table_id: pt.table_id })) || [],
    },
  };
}

export async function listTablesForPackages() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from("restaurant_tables")
    .select("id, name, capacity, status")
    .is("deleted_at", null)
    .eq("status", "available")
    .order("name");

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createPackage(formData) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin"].includes(auth.role)) return { error: "No tienes permisos" };

  const parsed = packageSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { package_tables, ...pkgData } = parsed.data;

  let price_ves = 0;
  try {
    const bcvRate = await getBcvRate();
    price_ves = Math.round(pkgData.price_usd * bcvRate * 100) / 100;
  } catch {
    return { error: "Error calculando precio en VES" };
  }

  const { data, error } = await auth.supabase
    .from("reservation_packages")
    .insert({ ...pkgData, price_ves })
    .select()
    .single();

  if (error) return { error: error.message };

  if (package_tables.length > 0) {
    const inserts = package_tables.map((pt) => ({ package_id: data.id, table_id: pt.table_id }));
    const { error: relError } = await auth.supabase.from("reservation_package_tables").insert(inserts);
    if (relError) {
      await auth.supabase.from("reservation_packages").delete().eq("id", data.id);
      return { error: relError.message };
    }
  }

  revalidatePath("/admin/paquetes-reservacion");
  return { data, success: "Paquete creado correctamente" };
}

export async function updatePackage(id, formData) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin"].includes(auth.role)) return { error: "No tienes permisos" };

  const parsed = packageSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { package_tables, ...pkgData } = parsed.data;

  let price_ves = 0;
  try {
    const bcvRate = await getBcvRate();
    price_ves = Math.round(pkgData.price_usd * bcvRate * 100) / 100;
  } catch {
    return { error: "Error calculando precio en VES" };
  }

  const { data, error } = await auth.supabase
    .from("reservation_packages")
    .update({ ...pkgData, price_ves })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return { error: error.message };

  await auth.supabase.from("reservation_package_tables").delete().eq("package_id", id);

  if (package_tables.length > 0) {
    const inserts = package_tables.map((pt) => ({ package_id: id, table_id: pt.table_id }));
    const { error: relError } = await auth.supabase.from("reservation_package_tables").insert(inserts);
    if (relError) return { error: relError.message };
  }

  revalidatePath("/admin/paquetes-reservacion");
  return { data, success: "Paquete actualizado correctamente" };
}

export async function deletePackage(id) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin"].includes(auth.role)) return { error: "No tienes permisos" };

  const { error } = await auth.supabase.from("reservation_packages").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/paquetes-reservacion");
  return { success: "Paquete eliminado (movido a papelera)" };
}

export async function restorePackage(id) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin"].includes(auth.role)) return { error: "No tienes permisos" };

  const { error } = await auth.supabase.from("reservation_packages").update({ deleted_at: null }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/paquetes-reservacion");
  return { success: "Paquete restaurado correctamente" };
}