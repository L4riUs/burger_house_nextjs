"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { rawMaterialFormSchema } from "../schemas";

export function RawMaterialForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading,
  categories = [],
  units = [],
  suppliers = []
}) {
  const methods = useForm({
    resolver: zodResolver(rawMaterialFormSchema),
    defaultValues: {
      name: "",
      category_id: "",
      unit_id: "",
      min_stock: 0,
      average_cost: 0,
      primary_supplier_id: null,
      ...initialData,
    },
  });

  const { control, handleSubmit, register, formState: { errors }, watch, reset } = methods;
  const categoryId = watch("category_id");
  const unitId = watch("unit_id");
  const supplierId = watch("primary_supplier_id");

  // Compute display labels for selected values
  const selectedCategoryLabel = categories.find(c => c.id === categoryId)?.name?.es || categories.find(c => c.id === categoryId)?.name || "";
  const selectedUnitLabel = units.find(u => u.id === unitId)?.name || "";
  const selectedSupplierLabel = suppliers.find(s => s.id === supplierId)?.name || "";

  useEffect(() => {
    if (initialData) {
      methods.reset({
        name: initialData.name || "",
        category_id: initialData.category_id || "",
        unit_id: initialData.unit_id || "",
        min_stock: initialData.min_stock || 0,
        average_cost: initialData.average_cost || 0,
        primary_supplier_id: initialData.primary_supplier_id || null,
      });
    }
  }, [initialData, methods]);

  const handleSubmitForm = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Ej: Carne de res, Pan de hamburguesa, Lechuga"
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="category_id">Categoría *</Label>
        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={field.onChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría">
                  {selectedCategoryLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name?.es || cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {selectedCategoryLabel && (
          <p className="text-xs text-muted-foreground">Seleccionado: {selectedCategoryLabel}</p>
        )}
        {errors.category_id && <p className="text-sm text-destructive">{errors.category_id.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="unit_id">Unidad de Medida *</Label>
        <Controller
          name="unit_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={field.onChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una unidad">
                  {selectedUnitLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} ({unit.abbreviation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {selectedUnitLabel && (
          <p className="text-xs text-muted-foreground">Seleccionado: {selectedUnitLabel}</p>
        )}
        {errors.unit_id && <p className="text-sm text-destructive">{errors.unit_id.message}</p>}
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Label htmlFor="min_stock">Stock Mínimo *</Label>
          <Input
            id="min_stock"
            type="number"
            min="0"
            step="0.001"
            {...register("min_stock", { valueAsNumber: true })}
            disabled={isLoading}
          />
          {errors.min_stock && <p className="text-sm text-destructive">{errors.min_stock.message}</p>}
        </div>

        <div className="space-y-4">
          <Label htmlFor="average_cost">Costo Promedio *</Label>
          <Input
            id="average_cost"
            type="number"
            min="0"
            step="0.01"
            {...register("average_cost", { valueAsNumber: true })}
            disabled={isLoading}
          />
          {errors.average_cost && <p className="text-sm text-destructive">{errors.average_cost.message}</p>}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label htmlFor="primary_supplier_id">Proveedor Principal</Label>
        <Controller
          name="primary_supplier_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={(value) => field.onChange(value === "" ? null : value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proveedor">
                  {selectedSupplierLabel}
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
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Stock Actual</Label>
        <div className="p-4 bg-muted/50 rounded-lg border">
          <p className="text-lg font-medium text-center">
            Stock: se gestiona en el módulo de Inventario
          </p>
          <p className="text-sm text-muted-foreground text-center mt-1">
            El stock se calcula automáticamente a partir de los movimientos de inventario (entradas, salidas, ajustes, mermas).
            No es editable desde este formulario.
          </p>
          {initialData?.current_stock !== undefined && (
            <p className="text-sm text-center mt-2">
              Stock actual: <strong>{Number(initialData.current_stock).toLocaleString()}</strong> {initialData.unit?.abbreviation || ""}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : initialData ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}