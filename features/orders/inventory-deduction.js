import { ALLOW_NEGATIVE_STOCK } from '@/lib/config';
import { convertUnits } from '@/lib/unit-conversion';

export async function calculateInventoryMovements(orderItems, supabase) {
  const movements = [];
  const stockChecks = [];

  // Cargar todas las unidades para conversión
  const { data: units } = await supabase
    .from('units')
    .select('id, unit_type, conversion_factor, abbreviation');

  for (const item of orderItems) {
    if (item.type === 'product') {
      const { data: product } = await supabase
        .from('products')
        .select('id, product_type')
        .eq('id', item.product_id)
        .single();

      if (!product) continue;

      if (product.product_type === 'prepared') {
        const { data: recipeItems } = await supabase
          .from('recipe_items')
          .select(`
            quantity,
            unit_id,
            raw_material_id,
            raw_material:raw_materials(id, name, unit_id, unit:units(id, abbreviation))
          `)
          .eq('product_id', item.product_id);

        for (const recipe of recipeItems || []) {
          // Convertir cantidad de receta (en unidad de receta) a unidad del material
          const qty = convertUnits(
            Number(recipe.quantity) * Number(item.quantity),
            recipe.unit_id,
            recipe.raw_material.unit_id,
            units
          );
          
          movements.push({
            item_type: 'raw_material',
            raw_material_id: recipe.raw_material_id,
            movement_type: 'sale_out',
            quantity: qty,
            unit_id: recipe.raw_material.unit_id, // unidad base del material
          });

          if (!ALLOW_NEGATIVE_STOCK) {
            stockChecks.push({
              item_type: 'raw_material',
              item_id: recipe.raw_material_id,
              required_qty: qty,
            });
          }
        }
      } else {
        movements.push({
          item_type: 'product',
          product_id: item.product_id,
          movement_type: 'sale_out',
          quantity: Number(item.quantity),
        });

        if (!ALLOW_NEGATIVE_STOCK) {
          stockChecks.push({
            item_type: 'product',
            item_id: item.product_id,
            required_qty: Number(item.quantity),
          });
        }
      }

      if (item.extras && item.extras.length > 0) {
        for (const extra of item.extras) {
          const { data: extraData } = await supabase
            .from('product_extras')
            .select('raw_material_id, raw_material_quantity, unit_id, raw_material:raw_materials(id, unit_id)')
            .eq('id', extra.extra_id)
            .single();

          if (extraData?.raw_material_id) {
            const qty = convertUnits(
              Number(extraData.raw_material_quantity || 1) * Number(extra.quantity || 1) * Number(item.quantity),
              extraData.unit_id,
              extraData.raw_material.unit_id,
              units
            );
            
            movements.push({
              item_type: 'raw_material',
              raw_material_id: extraData.raw_material_id,
              movement_type: 'sale_out',
              quantity: qty,
              unit_id: extraData.raw_material.unit_id,
            });

            if (!ALLOW_NEGATIVE_STOCK) {
              stockChecks.push({
                item_type: 'raw_material',
                item_id: extraData.raw_material_id,
                required_qty: qty,
              });
            }
          }
        }
      }
    } else if (item.type === 'combo') {
      const { data: comboItems } = await supabase
        .from('combo_items')
        .select(`
          quantity,
          product:products(id, product_type)
        `)
        .eq('combo_id', item.combo_id);

      for (const comboItem of comboItems || []) {
        const subItem = {
          type: 'product',
          product_id: comboItem.product.id,
          quantity: Number(comboItem.quantity) * Number(item.quantity),
          extras: [],
        };
        const subMovements = await calculateInventoryMovements([subItem], supabase);
        movements.push(...subMovements.movements);
        stockChecks.push(...subMovements.stockChecks);
      }
    }
  }

  return { movements, stockChecks };
}

export async function checkStockAvailability(stockChecks, supabase) {
  if (!stockChecks.length) return { ok: true };

  const rawMaterialIds = [...new Set(stockChecks.filter(s => s.item_type === 'raw_material').map(s => s.item_id))];
  const productIds = [...new Set(stockChecks.filter(s => s.item_type === 'product').map(s => s.item_id))];

  const checks = [];

  if (rawMaterialIds.length) {
    const { data } = await supabase
      .from('current_stock')
      .select('item_id, stock')
      .eq('item_type', 'raw_material')
      .in('item_id', rawMaterialIds);

    const stockMap = new Map((data || []).map(d => [d.item_id, Number(d.stock)]));

    for (const check of stockChecks.filter(s => s.item_type === 'raw_material')) {
      const current = stockMap.get(check.item_id) || 0;
      if (current - check.required_qty < 0) {
        checks.push({
          ok: false,
          item_type: 'raw_material',
          item_id: check.item_id,
          current_stock: current,
          required_qty: check.required_qty,
          shortage: check.required_qty - current,
        });
      }
    }
  }

  if (productIds.length) {
    const { data } = await supabase
      .from('current_stock')
      .select('item_id, stock')
      .eq('item_type', 'product')
      .in('item_id', productIds);

    const stockMap = new Map((data || []).map(d => [d.item_id, Number(d.stock)]));

    for (const check of stockChecks.filter(s => s.item_type === 'product')) {
      const current = stockMap.get(check.item_id) || 0;
      if (current - check.required_qty < 0) {
        checks.push({
          ok: false,
          item_type: 'product',
          item_id: check.item_id,
          current_stock: current,
          required_qty: check.required_qty,
          shortage: check.required_qty - current,
        });
      }
    }
  }

  return {
    ok: checks.length === 0,
    warnings: checks,
  };
}