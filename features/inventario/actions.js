"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inventoryMovementSchema } from "./schemas";
import { convertUnits, unitsAreCompatible } from "@/lib/unit-conversion";

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
    return { error: parsed.error.issues[0].message };
  }

  // Cargar todas las unidades para conversión (patrón de inventory-deduction.js)
  const { data: units } = await supabase
    .from('units')
    .select('id, unit_type, conversion_factor, abbreviation');

  console.log('[createInventoryMovement] Payload recibido:', {
    item_type: parsed.data.item_type,
    raw_material_id: parsed.data.raw_material_id,
    product_id: parsed.data.product_id,
    movement_type: parsed.data.movement_type,
    quantity: parsed.data.quantity,
    unit_id: parsed.data.unit_id,
    unit_cost: parsed.data.unit_cost,
    supplier_id: parsed.data.supplier_id,
    note: parsed.data.note,
  });

  // Para materias primas, validar y convertir unidad
  let finalQuantity = parsed.data.quantity;
  let finalUnitId = parsed.data.unit_id;

  if (parsed.data.item_type === 'raw_material' && parsed.data.raw_material_id) {
    // Obtener información del material y su unidad base
    const { data: material } = await supabase
      .from('raw_materials')
      .select('id, name, unit_id, unit:units(id, unit_type, conversion_factor, abbreviation)')
      .eq('id', parsed.data.raw_material_id)
      .single();

    if (!material) {
      return { error: "Materia prima no encontrada" };
    }

    // Si no se proporciona unit_id, usar la del material
    const inputUnitId = parsed.data.unit_id || material.unit_id;

    // Validar que las unidades sean compatibles (mismo unit_type: mass, volume, etc.)
    if (!unitsAreCompatible(inputUnitId, material.unit_id, units)) {
      const { data: inputUnit } = await supabase
        .from('units')
        .select('unit_type, abbreviation')
        .eq('id', inputUnitId)
        .single();
      const { data: materialUnit } = await supabase
        .from('units')
        .select('unit_type, abbreviation')
        .eq('id', material.unit_id)
        .single();
      
      return { 
        error: `Unidad incompatible: la materia prima usa ${materialUnit?.abbreviation} (${materialUnit?.unit_type}), pero se intentó registrar en ${inputUnit?.abbreviation} (${inputUnit?.unit_type})` 
      };
    }

    // Convertir cantidad de la unidad de entrada a la unidad base del material
    finalQuantity = convertUnits(parsed.data.quantity, inputUnitId, material.unit_id, units);
    finalUnitId = material.unit_id; // Guardar en unidad base del material
  }

  // Para productos retail, si no hay unit_id, no requerimos conversión
  if (parsed.data.item_type === 'product' && parsed.data.product_id && !parsed.data.unit_id) {
    // Los productos retail no tienen unit_id en la tabla products, se maneja sin conversión
  }

  console.log('[createInventoryMovement] Payload procesado:', {
    item_type: parsed.data.item_type,
    raw_material_id: parsed.data.raw_material_id,
    product_id: parsed.data.product_id,
    movement_type: parsed.data.movement_type,
    original_quantity: parsed.data.quantity,
    final_quantity: finalQuantity,
    final_unit_id: finalUnitId,
    unit_cost: parsed.data.unit_cost,
    supplier_id: parsed.data.supplier_id,
    note: parsed.data.note,
  });

  const { data, error } = await supabase
    .from("inventory_movements")
    .insert({
      item_type: parsed.data.item_type,
      raw_material_id: parsed.data.raw_material_id,
      product_id: parsed.data.product_id,
      movement_type: parsed.data.movement_type,
      quantity: finalQuantity,
      unit_id: finalUnitId,
      unit_cost: parsed.data.unit_cost,
      supplier_id: parsed.data.supplier_id,
      note: parsed.data.note,
      performed_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[createInventoryMovement] Error insert:', error);
    return { error: error.message };
  }

  console.log('[createInventoryMovement] Movimiento guardado:', data);

  // Verificar el view current_stock después de insertar
  if (parsed.data.item_type === 'raw_material' && parsed.data.raw_material_id) {
    const { data: stockData, error: stockError } = await supabase
      .from('current_stock')
      .select('stock, unit_abbreviation')
      .eq('item_type', 'raw_material')
      .eq('item_id', parsed.data.raw_material_id)
      .single();
    
    console.log('[createInventoryMovement] Stock actual después de insertar:', { stockData, stockError });
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

  let materials = data || [];

  // Incluir stock actual
  if (materials.length > 0) {
    const { data: stockData } = await supabase
      .from("current_stock")
      .select("item_id, stock")
      .eq("item_type", "raw_material")
      .in("item_id", materials.map(m => m.id));

    const stockMap = new Map(stockData?.map(s => [s.item_id, s.stock]) || []);
    
    materials = materials.map(m => ({
      ...m,
      current_stock: stockMap.get(m.id) || 0,
    }));
  }

  return { data: materials };
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