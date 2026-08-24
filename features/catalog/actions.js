"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalizedField } from "@/lib/i18n";

const PAGE_SIZE = 12;

export async function listPublicProducts({
  page = 1,
  pageSize = PAGE_SIZE,
  categoryId,
  search,
} = {}) {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name),
      product_extra_options!inner(extra:product_extras(id, name, price_ves, price_usd, raw_material_id))
      `,
      { count: "exact" }
    )
    .eq("is_active", true)
    .is("deleted_at", null);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (search) {
    query = query.ilike("name->>es", `%${search}%`);
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

export async function listPublicCategories() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("applies_to", "product")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function listPublicCombos() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("combos")
    .select(
      `
      *,
      combo_items(
        id,
        quantity,
        product:products(id, name, price_ves, price_usd)
      )
      `
    )
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name->>es", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function getProductForStore(id) {
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
        raw_material:raw_materials(id, name)
      ),
      product_extra_options!inner(
        extra:product_extras(id, name, price_ves, price_usd, raw_material_id, raw_material_quantity)
      )
      `
    )
    .eq("id", id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  const extras =
    data.product_extra_options?.map((opt) => opt.extra).filter(Boolean) || [];

  const result = {
    ...data,
    product_extras: extras,
    localized_name: getLocalizedField(data.name),
    localized_description: data.description
      ? getLocalizedField(data.description)
      : "",
    price_ves: Number(data.price_ves || 0),
    price_usd: Number(data.price_usd || 0),
  };

  return { data: result };
}

export async function getComboForStore(id) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("combos")
    .select(
      `
      *,
      combo_items(
        id,
        quantity,
        product:products(id, name, price_ves, price_usd, image_url, is_sold_out)
      )
      `
    )
    .eq("id", id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  const result = {
    ...data,
    localized_name: getLocalizedField(data.name),
    localized_description: data.description
      ? getLocalizedField(data.description)
      : "",
    price_ves: Number(data.price_ves || 0),
    price_usd: Number(data.price_usd || 0),
  };

  return { data: result };
}

export async function listAvailableTables() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("id, name, capacity, zone, status")
    .eq("status", "available")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function listActivePaymentMethods() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, currency, provider_code, is_active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: profile };
}
