"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { comboSchema } from "./schemas";
import { getBcvRate } from "@/lib/bcv";

const PAGE_SIZE = 10;

export async function listCombos({
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

  if (!actorProfile || !["owner", "admin", "cajero", "mesero", "cocina"].includes(actorProfile.role)) {
    return { error: "No tienes permisos para ver esta información" };
  }

  let query = supabase
    .from("combos")
    .select("*, combo_items(id, quantity, product:products(id, name))", { count: "exact" })
    .is("deleted_at", null);

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

export async function getCombo(id) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("combos")
    .select(
      `
      *,
      combo_items(
        id,
        quantity,
        product:products(id, name, price_usd)
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function listProductsForCombos() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, price_usd, product_type")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name->>es", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function createCombo(formData) {
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
    return { error: "No tienes permisos para crear combos" };
  }

  const parsed = comboSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { combo_items, ...comboData } = parsed.data;

  let price_ves = 0;
  try {
    const bcvRate = await getBcvRate();
    price_ves = Math.round(comboData.price_usd * bcvRate * 100) / 100;
  } catch (err) {
    return { error: "Error calculando precio en VES: " + err.message };
  }

  const { data, error } = await supabase
    .from("combos")
    .insert({
      name: comboData.name,
      description: comboData.description,
      price_usd: comboData.price_usd,
      price_ves: price_ves,
      image_url: comboData.image_url,
      is_active: comboData.is_active,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  if (combo_items.length > 0) {
    const itemInserts = combo_items.map((item) => ({
      combo_id: data.id,
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("combo_items")
      .insert(itemInserts);

    if (itemsError) {
      await supabase.from("combos").delete().eq("id", data.id);
      return { error: itemsError.message };
    }
  }

  revalidatePath("/admin/combos");
  return { data, success: "Combo creado correctamente" };
}

export async function updateCombo(id, formData) {
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
    return { error: "No tienes permisos para actualizar combos" };
  }

  const parsed = comboSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { combo_items, ...comboData } = parsed.data;

  let price_ves = 0;
  try {
    const bcvRate = await getBcvRate();
    price_ves = Math.round(comboData.price_usd * bcvRate * 100) / 100;
  } catch (err) {
    return { error: "Error calculando precio en VES: " + err.message };
  }

  const { data, error } = await supabase
    .from("combos")
    .update({
      name: comboData.name,
      description: comboData.description,
      price_usd: comboData.price_usd,
      price_ves: price_ves,
      image_url: comboData.image_url,
      is_active: comboData.is_active,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("combo_items").delete().eq("combo_id", id);

  if (combo_items.length > 0) {
    const itemInserts = combo_items.map((item) => ({
      combo_id: id,
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("combo_items")
      .insert(itemInserts);

    if (itemsError) {
      return { error: itemsError.message };
    }
  }

  revalidatePath("/admin/combos");
  return { data, success: "Combo actualizado correctamente" };
}

export async function deleteCombo(id) {
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
    return { error: "No tienes permisos para eliminar combos" };
  }

  const { error } = await supabase
    .from("combos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/combos");
  revalidatePath("/admin/papelera");

  return { success: "Combo eliminado (movido a papelera)" };
}

export async function restoreCombo(id) {
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
    return { error: "No tienes permisos para restaurar combos" };
  }

  const { error } = await supabase
    .from("combos")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/combos");
  revalidatePath("/admin/papelera");

  return { success: "Combo restaurado correctamente" };
}
