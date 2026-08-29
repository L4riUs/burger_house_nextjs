"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { productExtraSchema } from "./schemas";
import { getBcvRate } from "@/lib/bcv";

const PAGE_SIZE = 10;

export async function listProductExtras({
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
    .from("product_extras")
    .select(
      `
      *,
      raw_material:raw_materials(id, name, unit:units(id, name, abbreviation))
    `,
      { count: "exact" }
    )
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

  const extras = data || [];

  const extraIds = extras.map((e) => e.id);
  if (extraIds.length > 0) {
    const { data: optionsData } = await supabase
      .from("product_extra_options")
      .select("extra_id, product_id")
      .in("extra_id", extraIds);

    const optionsMap = new Map();
    for (const opt of optionsData || []) {
      if (!optionsMap.has(opt.extra_id)) {
        optionsMap.set(opt.extra_id, []);
      }
      optionsMap.get(opt.extra_id).push(opt.product_id);
    }

    for (const extra of extras) {
      extra.product_ids = optionsMap.get(extra.id) || [];
    }
  }

  return {
    data: extras,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function getProductExtra(id) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_extras")
    .select(
      `
      *,
      raw_material:raw_materials(id, name, unit:units(id, name, abbreviation))
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  const { data: optionsData } = await supabase
    .from("product_extra_options")
    .select("product_id")
    .eq("extra_id", id);

  data.product_ids = optionsData?.map((o) => o.product_id) || [];

  return { data };
}

export async function listProductsForExtras() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, product_type")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name->>es", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function listRawMaterialsForExtras() {
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

export async function createProductExtra(formData) {
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
    return { error: "No tienes permisos para crear adicionales" };
  }

  const parsed = productExtraSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { product_ids, ...extraData } = parsed.data;

  let price_ves = 0;
  try {
    const bcvRate = await getBcvRate();
    price_ves = Math.round(extraData.price_usd * bcvRate * 100) / 100;
  } catch (err) {
    return { error: "Error calculando precio en VES: " + err.message };
  }

  const { data, error } = await supabase
    .from("product_extras")
    .insert({
      name: extraData.name,
      price_usd: extraData.price_usd,
      price_ves: price_ves,
      raw_material_id: extraData.raw_material_id || null,
      raw_material_quantity: extraData.raw_material_quantity || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  if (product_ids && product_ids.length > 0) {
    const optionInserts = product_ids.map((productId) => ({
      product_id: productId,
      extra_id: data.id,
    }));

    const { error: optionsError } = await supabase
      .from("product_extra_options")
      .insert(optionInserts);

    if (optionsError) {
      return { error: optionsError.message };
    }
  }

  revalidatePath("/admin/adicionales");
  return { data, success: "Adicional creado correctamente" };
}

export async function updateProductExtra(id, formData) {
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
    return { error: "No tienes permisos para actualizar adicionales" };
  }

  const parsed = productExtraSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { product_ids, ...extraData } = parsed.data;

  let price_ves = 0;
  try {
    const bcvRate = await getBcvRate();
    price_ves = Math.round(extraData.price_usd * bcvRate * 100) / 100;
  } catch (err) {
    return { error: "Error calculando precio en VES: " + err.message };
  }

  const { data, error } = await supabase
    .from("product_extras")
    .update({
      name: extraData.name,
      price_usd: extraData.price_usd,
      price_ves: price_ves,
      raw_material_id: extraData.raw_material_id || null,
      raw_material_quantity: extraData.raw_material_quantity || null,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("product_extra_options").delete().eq("extra_id", id);

  if (product_ids && product_ids.length > 0) {
    const optionInserts = product_ids.map((productId) => ({
      product_id: productId,
      extra_id: id,
    }));

    const { error: optionsError } = await supabase
      .from("product_extra_options")
      .insert(optionInserts);

    if (optionsError) {
      return { error: optionsError.message };
    }
  }

  revalidatePath("/admin/adicionales");
  return { data, success: "Adicional actualizado correctamente" };
}

export async function deleteProductExtra(id) {
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
    return { error: "No tienes permisos para eliminar adicionales" };
  }

  const { error } = await supabase
    .from("product_extras")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/adicionales");
  return { success: "Adicional eliminado (movido a papelera)" };
}

export async function restoreProductExtra(id) {
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
    return { error: "No tienes permisos para restaurar adicionales" };
  }

  const { error } = await supabase
    .from("product_extras")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/adicionales");
  return { success: "Adicional restaurado correctamente" };
}
