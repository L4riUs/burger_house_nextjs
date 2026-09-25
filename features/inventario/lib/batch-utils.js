import { convertUnits, unitsAreCompatible, findUnitById } from "@/lib/unit-conversion";

export class BatchValidationError extends Error {
  constructor(itemIndex, message) {
    super(`Ítem ${itemIndex + 1}: ${message}`);
    this.name = 'BatchValidationError';
    this.itemIndex = itemIndex;
  }
}

export function buildBatchInsertPayload(items, units, rawMaterials) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El batch debe contener al menos un ítem");
  }

  const materialMap = new Map(rawMaterials?.map(m => [m.id, m]) || []);
  const payload = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let finalQuantity = item.quantity;
    let finalUnitId = item.unit_id;

    if (item.item_type === 'raw_material' && item.raw_material_id) {
      const material = materialMap.get(item.raw_material_id);
      if (!material) {
        throw new BatchValidationError(i, `Materia prima no encontrada (ID: ${item.raw_material_id})`);
      }

      const inputUnitId = item.unit_id || material.unit_id;

      if (!unitsAreCompatible(inputUnitId, material.unit_id, units)) {
        const inputUnit = findUnitById(units, inputUnitId);
        const materialUnit = findUnitById(units, material.unit_id);
        throw new BatchValidationError(
          i,
          `Unidad incompatible: la materia prima usa ${materialUnit?.abbreviation} (${materialUnit?.unit_type}), pero se intentó registrar en ${inputUnit?.abbreviation} (${inputUnit?.unit_type})`
        );
      }

      finalQuantity = convertUnits(item.quantity, inputUnitId, material.unit_id, units);
      finalUnitId = material.unit_id;
    }

    if (item.item_type === 'product' && item.product_id && !item.unit_id) {
      // Productos retail no requieren conversión de unidad
    }

    payload.push({
      item_type: item.item_type,
      raw_material_id: item.item_type === 'raw_material' ? item.raw_material_id : null,
      product_id: item.item_type === 'product' ? item.product_id : null,
      movement_type: item.movement_type,
      quantity: finalQuantity,
      unit_id: finalUnitId,
      unit_cost: item.unit_cost,
      supplier_id: item.supplier_id,
      note: item.note,
    });
  }

  return payload;
}