"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inventoryMovementSchema } from "./schemas";

const PAGE_SIZE = 20;

export async function listInventoryMovements({
  page = 1,
  pageSize = PAGE_SIZE,
  itemType,
  itemId,
  movementType,
  dateFrom,
  dateTo,
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
    .from("inventory_movements")
    .select(`
      *,
      raw_material:raw_materials(id, name, unit:units(abbreviation)),
      product:products(id, name),
      supplier:suppliers(id, name),
      performed_by_profile:profiles!performed_by(id, full_name)
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  if (itemType) {
    query = query.eq("item_type", itemType);
  }

  if (itemId) {
    if (itemType === 'raw_material') {
      query = query.eq("raw_material_id", itemId);
    } else if (itemType === 'product') {
      query = query.eq("product_id", itemId);
    }
  }

  if (movementType) {
    query = query.eq("movement_type", movementType);
  }

  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }

  if (dateTo) {
    query = query.lte("created_at", dateTo);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

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

export async function getInventoryMovementsByItem(itemType, itemId, { page = 1, pageSize = 50 } = {}) {
  const supabase = await createClient();

  let query = supabase
    .from("inventory_movements")
    .select(`
      *,
      raw_material:raw_materials(id, name, unit:units(abbreviation)),
      product:products(id, name),
      supplier:suppliers(id, name),
      performed_by_profile:profiles!performed_by(id, full_name)
    `, { count: "exact" })
    .eq("item_type", itemType)
    .order("created_at", { ascending: false });

  if (itemType === 'raw_material') {
    query = query.eq("raw_material_id", itemId);
  } else if (itemType === 'product') {
    query = query.eq("product_id", itemId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

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

export async function createInventoryMovement(formData) {
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
    return { error: "No tienes permisos para registrar movimientos de inventario" };
  }

  const parsed = inventoryMovementSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("inventory_movements")
    .insert({
      item_type: parsed.data.item_type,
      raw_material_id: parsed.data.raw_material_id,
      product_id: parsed.data.product_id,
      movement_type: parsed.data.movement_type,
      quantity: parsed.data.quantity,
      unit_cost: parsed.data.unit_cost,
      supplier_id: parsed.data.supplier_id,
      note: parsed.data.note,
      performed_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventario/movimientos");
  revalidatePath("/admin/inventario/kardex");
  revalidatePath("/admin/inventario/materias-primas");
  
  return { data, success: "Movimiento registrado correctamente" };
}

export async function listRawMaterialsForMovement() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("raw_materials")
    .select(`
      id,
      name,
      unit:units(id, name, abbreviation),
      min_stock
    `)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function listProductsForMovement() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      product_type
    `)
    .is("deleted_at", null)
    .eq("product_type", "retail")
    .eq("is_active", true)
    .order("name->>es", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function listSuppliersForMovement() {
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

export async function getCurrentStock(itemType, itemId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("current_stock")
    .select("stock")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .single();

  if (error) {
    return { stock: 0 };
  }

  return { stock: data?.stock || 0 };
}