"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2Icon, PlusIcon, AlertTriangleIcon } from "lucide-react";
import { inventoryMovementBatchSchema, inventoryMovementFormSchema } from "../schemas";
import {
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_VARIANTS,
  getMovementTypeOptionsGrouped,
  getMovementTypeLabel,
} from "../lib/movement-utils";

const MAX_LINES = 50;
const WARNING_THRESHOLD = 10;

export function MovementBatchForm({
  rawMaterials = [],
  products = [],
  suppliers = [],
  units = [],
  onSubmit,
  onCancel,
  isLoading,
}) {
  const methods = useForm({
    resolver: zodResolver(inventoryMovementBatchSchema),
    defaultValues: {
      items: [
        {
          item_type: "raw_material",
          raw_material_id: null,
          product_id: null,
          movement_type: MOVEMENT_TYPES.PURCHASE_IN,
          quantity: "",
          unit_id: null,
          unit_cost: null,
          supplier_id: null,
          note: "",
        },
      ],
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = methods;

  const items = watch("items");
  const headerMovementType = watch("items.0.movement_type") || MOVEMENT_TYPES.PURCHASE_IN;
  const headerSupplierId = watch("items.0.supplier_id") || null;
  const headerNote = watch("items.0.note") || "";

  const [showDuplicateWarnings, setShowDuplicateWarnings] = useState({});

  const isPurchase = headerMovementType === MOVEMENT_TYPES.PURCHASE_IN;
  const linesCount = items.length;
  const showWarning = linesCount > WARNING_THRESHOLD;
  const atMaxLines = linesCount >= MAX_LINES;

  useEffect(() => {
    if (items.length > 0) {
      const firstItem = items[0];
      for (let i = 1; i < items.length; i++) {
        if (items[i].movement_type !== firstItem.movement_type) {
          setValue(`items.${i}.movement_type`, firstItem.movement_type);
        }
        if (items[i].supplier_id !== firstItem.supplier_id) {
          setValue(`items.${i}.supplier_id`, firstItem.supplier_id);
        }
        if (items[i].note !== firstItem.note) {
          setValue(`items.${i}.note`, firstItem.note);
        }
      }
    }
  }, [headerMovementType, headerSupplierId, headerNote, items, setValue]);

  const checkDuplicates = (currentItems) => {
    const seen = new Map();
    const duplicates = new Set();

    currentItems.forEach((item, index) => {
      const key = item.item_type === 'raw_material'
        ? `raw_${item.raw_material_id}`
        : `prod_${item.product_id}`;

      if (key && key !== 'raw_null' && key !== 'prod_null') {
        if (seen.has(key)) {
          duplicates.add(seen.get(key));
          duplicates.add(index);
        } else {
          seen.set(key, index);
        }
      }
    });

    const newWarnings = {};
    duplicates.forEach(idx => {
      newWarnings[idx] = true;
    });
    setShowDuplicateWarnings(newWarnings);
  };

  useEffect(() => {
    checkDuplicates(items);
  }, [items]);

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
  });

  const addLine = () => {
    if (linesCount >= MAX_LINES) return;

    const firstItem = items[0] || {};
    append({
      item_type: "raw_material",
      raw_material_id: null,
      product_id: null,
      movement_type: firstItem.movement_type || MOVEMENT_TYPES.PURCHASE_IN,
      quantity: "",
      unit_id: null,
      unit_cost: null,
      supplier_id: firstItem.supplier_id || null,
      note: firstItem.note || "",
    });
  };

  const removeLine = (index) => {
    if (linesCount <= 1) return;
    remove(index);
  };

  const handleItemTypeChange = (index, value) => {
    setValue(`items.${index}.item_type`, value);
    if (value === "raw_material") {
      setValue(`items.${index}.product_id`, null);
    } else {
      setValue(`items.${index}.raw_material_id`, null);
    }
    setValue(`items.${index}.unit_id`, null);
    trigger(`items.${index}.raw_material_id`);
    trigger(`items.${index}.product_id`);
  };

  const handleRawMaterialSelect = (index, value) => {
    setValue(`items.${index}.raw_material_id`, value || null);
    if (value) {
      const material = rawMaterials.find(m => m.id === value);
      if (material?.unit_id) {
        setValue(`items.${index}.unit_id`, material.unit_id);
      }
    }
  };

  const handleProductSelect = (index, value) => {
    setValue(`items.${index}.product_id`, value || null);
  };

  const handleMovementTypeChange = (value) => {
    for (let i = 0; i < linesCount; i++) {
      setValue(`items.${i}.movement_type`, value);
    }
  };

  const handleSupplierChange = (value) => {
    for (let i = 0; i < linesCount; i++) {
      setValue(`items.${i}.supplier_id`, value || null);
    }
  };

  const handleNoteChange = (value) => {
    for (let i = 0; i < linesCount; i++) {
      setValue(`items.${i}.note`, value);
    }
  };

  const handleSubmitForm = (data) => {
    onSubmit(data.items);
  };

  const getItemErrors = (index) => {
    if (!errors.items) return {};
    const itemErrors = errors.items[index];
    return itemErrors || {};
  };

  const getSelectedRawMaterial = (rawMaterialId) => {
    return rawMaterials.find(m => m.id === rawMaterialId);
  };

  const getSelectedProduct = (productId) => {
    return products.find(p => p.id === productId);
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
      {showWarning && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            Este batch tiene <strong>{linesCount} líneas</strong>. Se recomienda dividir en batches más pequeños para mejor rendimiento.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 border p-4 rounded-lg bg-muted/30">
        <h3 className="font-medium text-lg">Cabecera (aplica a todas las líneas)</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Movimiento *</Label>
            <Controller
              name="items.0.movement_type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleMovementTypeChange(value);
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de movimiento">
                      {getMovementTypeLabel(field.value)}
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
            {getItemErrors(0).movement_type && (
              <p className="text-sm text-destructive">{getItemErrors(0).movement_type.message}</p>
            )}
          </div>

          {isPurchase && (
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <Controller
                name="items.0.supplier_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(value) => {
                      field.onChange(value === "" ? null : value);
                      handleSupplierChange(value === "" ? null : value);
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proveedor">
                        {suppliers.find(s => s.id === field.value)?.name || "Selecciona un proveedor"}
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
              {getItemErrors(0).supplier_id && (
                <p className="text-sm text-destructive">{getItemErrors(0).supplier_id.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Nota / Observación (común a todas las líneas)</Label>
            <Controller
              name="items.0.note"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder="Detalles adicionales del movimiento..."
                  rows={2}
                  disabled={isLoading}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    handleNoteChange(e.target.value);
                  }}
                />
              )}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Líneas del movimiento ({linesCount})</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            disabled={isLoading || atMaxLines}
            className="gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar línea
            {atMaxLines && <span className="text-xs text-muted-foreground">(máx. 50)</span>}
          </Button>
        </div>

        {fields.map((field, index) => {
          const itemErrors = getItemErrors(index);
          const itemValues = items[index] || {};
          const isDuplicate = showDuplicateWarnings[index];
          const showRawMaterial = itemValues.item_type === "raw_material";
          const showProduct = itemValues.item_type === "product";
          const isItemPurchase = itemValues.movement_type === MOVEMENT_TYPES.PURCHASE_IN;
          const selectedMaterial = showRawMaterial ? getSelectedRawMaterial(itemValues.raw_material_id) : null;
          const selectedProduct = showProduct ? getSelectedProduct(itemValues.product_id) : null;

          return (
            <div
              key={field.id}
              className={`space-y-4 p-4 rounded-lg border ${isDuplicate ? "border-amber-500 bg-amber-50/50" : "bg-muted/30"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  {isDuplicate && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      <AlertTriangleIcon className="h-3 w-3" />
                      Ítem duplicado en el batch
                    </span>
                  )}

                  <div className="space-y-2">
                    <Label>Tipo de Ítem *</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="raw_material"
                          checked={showRawMaterial}
                          onChange={() => handleItemTypeChange(index, "raw_material")}
                          disabled={isLoading}
                          className="h-4 w-4"
                        />
                        <span>Materia Prima</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="product"
                          checked={showProduct}
                          onChange={() => handleItemTypeChange(index, "product")}
                          disabled={isLoading}
                          className="h-4 w-4"
                        />
                        <span>Producto Retail</span>
                      </label>
                    </div>
                    {itemErrors.item_type && <p className="text-sm text-destructive">{itemErrors.item_type.message}</p>}
                  </div>

                  {showRawMaterial && (
                    <div className="space-y-2">
                      <Label>Materia Prima *</Label>
                      <Controller
                        name={`items.${index}.raw_material_id`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ? String(field.value) : undefined}
                            onValueChange={(value) => {
                              field.onChange(value || null);
                              handleRawMaterialSelect(index, value || null);
                            }}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una materia prima">
                                {selectedMaterial?.name || "Selecciona una materia prima"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {rawMaterials.map((material) => (
                                <SelectItem key={material.id} value={material.id}>
                                  {material.name} ({material.unit?.abbreviation || "un"}) - Stock: {material.current_stock || 0} {material.unit?.abbreviation || ""} (Mín: {material.min_stock})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {itemErrors.raw_material_id && <p className="text-sm text-destructive">{itemErrors.raw_material_id.message}</p>}
                      {selectedMaterial && (
                        <p className="text-xs text-muted-foreground">
                          Stock actual: <strong>{Number(selectedMaterial.current_stock || 0).toLocaleString()}</strong> {selectedMaterial.unit?.abbreviation || ""} | Stock mínimo: <strong>{Number(selectedMaterial.min_stock || 0).toLocaleString()}</strong> {selectedMaterial.unit?.abbreviation || ""}
                        </p>
                      )}
                    </div>
                  )}

                  {showProduct && (
                    <div className="space-y-2">
                      <Label>Producto Retail *</Label>
                      <Controller
                        name={`items.${index}.product_id`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ? String(field.value) : undefined}
                            onValueChange={(value) => {
                              field.onChange(value || null);
                              handleProductSelect(index, value || null);
                            }}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un producto retail">
                                {selectedProduct?.name?.es || selectedProduct?.name || "Selecciona un producto retail"}
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
                      {itemErrors.product_id && <p className="text-sm text-destructive">{itemErrors.product_id.message}</p>}
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        Cantidad {selectedMaterial?.unit?.abbreviation ? `(${selectedMaterial.unit.abbreviation})` : ""} *
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        {...methods.register(`items.${index}.quantity`, { valueAsNumber: true })}
                        placeholder="Ej: 100.5"
                        disabled={isLoading}
                      />
                      {itemErrors.quantity && <p className="text-sm text-destructive">{itemErrors.quantity.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Costo Unitario {isItemPurchase ? "*" : "(opcional)"}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...methods.register(`items.${index}.unit_cost`, { valueAsNumber: true })}
                        placeholder="Ej: 25.50"
                        disabled={isLoading || !isItemPurchase}
                      />
                      {itemErrors.unit_cost && <p className="text-sm text-destructive">{itemErrors.unit_cost.message}</p>}
                      {!isItemPurchase && (
                        <p className="text-sm text-muted-foreground">Solo requerido para compras</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(index)}
                    disabled={isLoading || linesCount <= 1}
                    className="text-destructive hover:bg-destructive/10"
                    aria-label={`Eliminar línea ${index + 1}`}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">Línea {index + 1}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Registrando..."
            : `Registrar ${linesCount} Movimiento${linesCount !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </form>
  );
}