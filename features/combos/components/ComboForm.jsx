"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { comboFormSchema } from "../schemas";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { PlusIcon, TrashIcon } from "lucide-react";

export function ComboForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  products = [],
}) {
  const methods = useForm({
    resolver: zodResolver(comboFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price_usd: 0,
      image_url: "",
      is_active: true,
      combo_items: [],
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "combo_items",
  });

  useEffect(() => {
    if (initialData) {
      const comboItems = initialData.combo_items
        ? initialData.combo_items.map((item) => ({
            product_id: item.product_id || item.product?.id || "",
            quantity: item.quantity || 1,
          }))
        : [];

      reset({
        name: initialData.name || "",
        description: initialData.description || "",
        price_usd: initialData.price_usd || 0,
        image_url: initialData.image_url || "",
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
        combo_items: comboItems,
      });
    }
  }, [initialData, reset]);

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
          placeholder="Ej: Combo Familiar, Combo Infantil"
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Descripción del combo para el catálogo..."
          rows={3}
          disabled={isLoading}
        />
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
        <Label htmlFor="image_url">Imagen</Label>
        <Controller
          name="image_url"
          control={control}
          render={({ field: { value, onChange } }) => (
            <ImageUploadField
              id="image_url"
              value={value || ""}
              onChange={onChange}
              disabled={isLoading}
              folder="combos"
              label="Imagen del combo"
            />
          )}
        />
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={watch("is_active")}
            onCheckedChange={(checked) => setValue("is_active", !!checked)}
            disabled={isLoading}
          />
          <span>Activo (visible en catálogo)</span>
        </label>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Productos del Combo *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ product_id: "", quantity: 1 })}
            disabled={isLoading}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Agregar Producto
          </Button>
        </div>

        {errors.combo_items?.message && (
          <p className="text-sm text-destructive">{errors.combo_items.message}</p>
        )}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            No hay productos agregados. Haga clic en &quot;Agregar Producto&quot; para comenzar.
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex-1 space-y-1">
                {index === 0 && <Label className="text-xs text-muted-foreground">Producto</Label>}
                <Controller
                  name={`combo_items.${index}.product_id`}
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value ? String(value) : undefined}
                      onValueChange={onChange}
                      disabled={isLoading}
                      items={products.map((product) => ({
                        value: String(product.id),
                        label: `${product.name?.es || product.name} - $${Number(product.price_usd || 0).toFixed(2)}`,
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.name?.es || product.name} - ${Number(product.price_usd || 0).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors?.combo_items?.[index]?.product_id && (
                  <p className="text-xs text-destructive">
                    {errors.combo_items[index].product_id.message}
                  </p>
                )}
              </div>

              <div className="w-24 space-y-1">
                {index === 0 && <Label className="text-xs text-muted-foreground">Cantidad</Label>}
                <Controller
                  name={`combo_items.${index}.quantity`}
                  control={control}
                  render={({ field: { value, onChange, ref } }) => (
                    <Input
                      type="number"
                      min="1"
                      value={value ?? ""}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value);
                        onChange(isNaN(parsed) ? "" : parsed);
                      }}
                      disabled={isLoading}
                      ref={ref}
                    />
                  )}
                />
                {errors?.combo_items?.[index]?.quantity && (
                  <p className="text-xs text-destructive">
                    {errors.combo_items[index].quantity.message}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                disabled={isLoading}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
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
