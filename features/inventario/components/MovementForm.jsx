"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { inventoryMovementFormSchema } from "../schemas";
import { 
  MOVEMENT_TYPES, 
  MOVEMENT_TYPE_LABELS, 
  MOVEMENT_TYPE_VARIANTS,
  getMovementTypeOptionsGrouped,
  getMovementTypeLabel,
} from "../lib/movement-utils";

export function MovementForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading,
  rawMaterials = [],
  products = [],
  suppliers = [],
  units = []
}) {
  const methods = useForm({
    resolver: zodResolver(inventoryMovementFormSchema),
    defaultValues: {
      item_type: "raw_material",
      raw_material_id: null,
      product_id: null,
      movement_type: MOVEMENT_TYPES.PURCHASE_IN,
      quantity: "",
      unit_id: null,
      unit_cost: null,
      supplier_id: null,
      note: "",
      ...initialData,
    },
  });

  const { control, handleSubmit, register, formState: { errors }, setValue, watch, reset } = methods;
  const itemType = watch("item_type");
  const movementType = watch("movement_type");
  const rawMaterialId = watch("raw_material_id");
  const productId = watch("product_id");
  const supplierId = watch("supplier_id");
  const [selectedItem, setSelectedItem] = useState(null);

  const isPurchase = movementType === MOVEMENT_TYPES.PURCHASE_IN;
  const showRawMaterial = itemType === "raw_material";
  const showProduct = itemType === "product";

  // Compute display labels for selected values
  const selectedRawMaterialLabel = rawMaterials.find(m => m.id === rawMaterialId)?.name || "";
  const selectedProductLabel = products.find(p => p.id === productId)?.name?.es || products.find(p => p.id === productId)?.name || "";
  const selectedSupplierLabel = suppliers.find(s => s.id === supplierId)?.name || "";

  useEffect(() => {
    if (initialData) {
      const itemTypeFromData = initialData.raw_material_id ? "raw_material" : "product";
      methods.reset({
        item_type: itemTypeFromData,
        raw_material_id: initialData.raw_material_id || null,
        product_id: initialData.product_id || null,
        movement_type: initialData.movement_type || MOVEMENT_TYPES.PURCHASE_IN,
        quantity: initialData.quantity || "",
        unit_id: initialData.unit_id || null,
        unit_cost: initialData.unit_cost || null,
        supplier_id: initialData.supplier_id || null,
        note: initialData.note || "",
      });
    }
  }, [initialData, methods]);

  useEffect(() => {
    if (showRawMaterial && initialData?.raw_material_id) {
      const material = rawMaterials.find(m => m.id === initialData.raw_material_id);
      setSelectedItem(material);
    } else if (showProduct && initialData?.product_id) {
      const product = products.find(p => p.id === initialData.product_id);
      setSelectedItem(product);
    }
  }, [showRawMaterial, showProduct, initialData, rawMaterials, products]);

  useEffect(() => {
    if (itemType === "raw_material") {
      setValue("product_id", null);
    } else if (itemType === "product") {
      setValue("raw_material_id", null);
    }
    setValue("supplier_id", null);
  }, [itemType, setValue]);

  // Cuando se selecciona una materia prima, actualizar unit_id automáticamente a la unidad base del material
  useEffect(() => {
    if (showRawMaterial && rawMaterialId) {
      const material = rawMaterials.find(m => m.id === rawMaterialId);
      if (material?.unit_id) {
        setValue("unit_id", material.unit_id);
      }
    }
  }, [showRawMaterial, rawMaterialId, rawMaterials, setValue]);

  const handleSubmitForm = (data) => {
    onSubmit(data);
  };

  const getCurrentStock = () => {
    if (!selectedItem) return null;
    if (showRawMaterial && selectedItem.min_stock !== undefined) {
      return selectedItem.min_stock;
    }
    return null;
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
      <div className="space-y-4">
        <Label>Tipo de Ítem *</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="raw_material"
              {...register("item_type")}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <span>Materia Prima</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="product"
              {...register("item_type")}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <span>Producto Retail</span>
          </label>
        </div>
        {errors.item_type && <p className="text-sm text-destructive">{errors.item_type.message}</p>}
      </div>

{showRawMaterial && (
        <div className="space-y-4">
          <Label htmlFor="raw_material_id">Materia Prima *</Label>
          <Controller
            name="raw_material_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : undefined}
                onValueChange={(value) => {
                  field.onChange(value || null);
                  const material = rawMaterials.find(m => m.id === value);
                  setSelectedItem(material || null);
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una materia prima">
                    {selectedRawMaterialLabel || "Selecciona una materia prima"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rawMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} ({material.unit?.abbreviation || "un"}) - Stock mín: {material.min_stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {selectedRawMaterialLabel && (
            <p className="text-xs text-muted-foreground">Seleccionado: {selectedRawMaterialLabel}</p>
          )}
          {errors.raw_material_id && <p className="text-sm text-destructive">{errors.raw_material_id.message}</p>}
</div>
      )}

{showProduct && (
        <div className="space-y-4">
          <Label htmlFor="product_id">Producto Retail *</Label>
          <Controller
            name="product_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : undefined}
                onValueChange={(value) => {
                  field.onChange(value || null);
                  const product = products.find(p => p.id === value);
                  setSelectedItem(product || null);
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto retail">
                    {selectedProductLabel || "Selecciona un producto retail"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name?.es || product.name} (Retail)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <Label>Tipo de Movimiento *</Label>
        <Controller
          name="movement_type"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={field.onChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de movimiento">
                  {getMovementTypeLabel(movementType)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {getMovementTypeOptionsGrouped().map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.movement_type && <p className="text-sm text-destructive">{errors.movement_type.message}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Label htmlFor="quantity">
            Cantidad {showRawMaterial && selectedItem?.unit?.abbreviation
              ? `(${selectedItem.unit.abbreviation}) `
              : ""}*
          </Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            min="0.001"
            {...register("quantity", { valueAsNumber: true })}
            placeholder="Ej: 100.5"
            disabled={isLoading}
          />
          {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
        </div>

        <div className="space-y-4">
          <Label htmlFor="unit_cost">Costo Unitario {isPurchase ? "*" : "(opcional)"}</Label>
          <Input
            id="unit_cost"
            type="number"
            step="0.01"
            min="0"
            {...register("unit_cost", { valueAsNumber: true })}
            placeholder="Ej: 25.50"
            disabled={isLoading || !isPurchase}
          />
          {errors.unit_cost && <p className="text-sm text-destructive">{errors.unit_cost.message}</p>}
          {!isPurchase && (
            <p className="text-sm text-muted-foreground">Solo requerido para compras (Compra / Entrada)</p>
          )}
        </div>
      </div>

      {isPurchase && (
        <div className="space-y-4">
          <Label htmlFor="supplier_id">Proveedor *</Label>
          <Controller
            name="supplier_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : undefined}
                onValueChange={(value) => field.onChange(value === "" ? null : value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proveedor">
                    {selectedSupplierLabel || "Selecciona un proveedor"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin proveedor</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {selectedSupplierLabel && (
            <p className="text-xs text-muted-foreground">Seleccionado: {selectedSupplierLabel}</p>
          )}
          {errors.supplier_id && <p className="text-sm text-destructive">{errors.supplier_id.message}</p>}
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <Label htmlFor="note">Nota / Observación</Label>
        <Textarea
          id="note"
          {...register("note")}
          placeholder="Detalles adicionales del movimiento..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      {selectedItem && selectedItem.min_stock !== undefined && (
        <div className="p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm font-medium">Stock mínimo configurado: <strong>{Number(selectedItem.min_stock).toLocaleString()}</strong> {selectedItem.unit?.abbreviation || ""}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Registrando..." : "Registrar Movimiento"}
        </Button>
      </div>
    </form>
  );
}