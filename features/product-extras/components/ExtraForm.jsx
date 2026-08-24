"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { productExtraFormSchema } from "../schemas";

export function ExtraForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  products = [],
  rawMaterials = [],
}) {
  const methods = useForm({
    resolver: zodResolver(productExtraFormSchema),
    defaultValues: {
      name: "",
      price_usd: 0,
      raw_material_id: null,
      raw_material_quantity: null,
      product_ids: [],
      ...initialData,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
  } = methods;

  const selectedProductIds = watch("product_ids") || [];
  const rawMaterialId = watch("raw_material_id");

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        price_usd: initialData.price_usd || 0,
        raw_material_id: initialData.raw_material_id || null,
        raw_material_quantity: initialData.raw_material_quantity || null,
        product_ids: initialData.product_ids || [],
      });
    }
  }, [initialData, reset]);

  const handleSubmitForm = (data) => {
    onSubmit(data);
  };

  const toggleProduct = (productId) => {
    const current = selectedProductIds;
    if (current.includes(productId)) {
      setValue(
        "product_ids",
        current.filter((id) => id !== productId)
      );
    } else {
      setValue("product_ids", [...current, productId]);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Ej: Bacon extra, Queso extra"
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="price_usd">Precio USD *</Label>
        <Input
          id="price_usd"
          type="number"
          step="0.01"
          min="0"
          {...register("price_usd", { valueAsNumber: true })}
          disabled={isLoading}
        />
        {errors.price_usd && (
          <p className="text-sm text-destructive">{errors.price_usd.message}</p>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Materia Prima (Opcional)</Label>
        <p className="text-sm text-muted-foreground">
          Si se asocia, el inventario se descontará automáticamente al venderse.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Materia Prima</Label>
            <Controller
              name="raw_material_id"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Select
                  value={value ? String(value) : "none"}
                  onValueChange={(val) => onChange(val === "none" ? null : val)}
                  disabled={isLoading}
                  items={[
                    { value: "none", label: "Sin materia prima" },
                    ...rawMaterials.map((rm) => ({
                      value: String(rm.id),
                      label: `${rm.name} (${rm.unit?.abbreviation || "un"})`,
                    })),
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin materia prima" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin materia prima</SelectItem>
                    {rawMaterials.map((rm) => (
                      <SelectItem key={rm.id} value={String(rm.id)}>
                        {rm.name} ({rm.unit?.abbreviation || "un"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {rawMaterialId && rawMaterialId !== "none" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cantidad por unidad</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                {...register("raw_material_quantity", { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.raw_material_quantity && (
                <p className="text-sm text-destructive">
                  {errors.raw_material_quantity.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Productos Asociados</Label>
        <p className="text-sm text-muted-foreground">
          Seleccione a qué productos aplica este adicional.
        </p>
        <div className="grid gap-2 md:grid-cols-2 max-h-60 overflow-y-auto border rounded-md p-3">
          {products.map((product) => (
            <label
              key={product.id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedProductIds.includes(product.id)}
                onCheckedChange={() => toggleProduct(product.id)}
                disabled={isLoading}
              />
              <span className="text-sm">
                {product.name?.es || product.name}
                <span className="text-muted-foreground ml-1">
                  ({product.product_type === "prepared" ? "Preparado" : "Retail"})
                </span>
              </span>
            </label>
          ))}
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
