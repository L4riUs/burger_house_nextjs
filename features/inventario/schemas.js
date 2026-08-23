import { z } from "zod";
import { MOVEMENT_TYPES, getAllMovementTypes } from "./lib/movement-utils";

const movementTypeEnum = z.enum(getAllMovementTypes());

export const inventoryMovementSchema = z.object({
  item_type: z.enum(['raw_material', 'product']),
  raw_material_id: z.string().uuid().nullable(),
  product_id: z.string().uuid().nullable(),
  movement_type: movementTypeEnum,
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unit_cost: z.coerce.number().min(0).nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  note: z.string().nullable().optional(),
}).refine((data) => {
  if (data.item_type === 'raw_material') {
    return data.raw_material_id !== null && data.raw_material_id !== undefined;
  }
  if (data.item_type === 'product') {
    return data.product_id !== null && data.product_id !== undefined;
  }
  return false;
}, {
  message: "Debe seleccionar el ítem correspondiente",
  path: ["raw_material_id"],
}).refine((data) => {
  const isPurchase = data.movement_type === MOVEMENT_TYPES.PURCHASE_IN;
  if (isPurchase && (!data.unit_cost || data.unit_cost <= 0)) {
    return false;
  }
  return true;
}, {
  message: "El costo unitario es requerido para compras",
  path: ["unit_cost"],
}).refine((data) => {
  const isPurchase = data.movement_type === MOVEMENT_TYPES.PURCHASE_IN;
  if (isPurchase && (!data.supplier_id)) {
    return false;
  }
  return true;
}, {
  message: "El proveedor es requerido para compras",
  path: ["supplier_id"],
});

export const inventoryMovementFormSchema = inventoryMovementSchema.safeExtend({
  item_type: z.enum(['raw_material', 'product']),
  raw_material_id: z.string().uuid("Debe seleccionar una materia prima").nullable(),
  product_id: z.string().uuid().nullable(),
  movement_type: movementTypeEnum,
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unit_cost: z.coerce.number().min(0, "El costo no puede ser negativo").nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  note: z.string().nullable().optional(),
});