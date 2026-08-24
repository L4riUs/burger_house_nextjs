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
import { productFormSchema } from "../schemas";
import { RecipeEditor } from "./RecipeEditor";
import { ImageUploadField } from "@/components/shared/image-upload-field";

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  categories = [],
  rawMaterials = [],
}) {
  const methods = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      product_type: "prepared",
      category_id: "",
      name: "",
      description: "",
      price_usd: 0,
      image_url: "",
      is_active: true,
      is_sold_out: false,
      min_stock: 0,
      recipe_items: [],
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

  const productType = watch("product_type");
  const isActive = watch("is_active");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "recipe_items",
  });

  useEffect(() => {
    if (initialData) {
      const recipeItems = initialData.recipe_items
        ? initialData.recipe_items.map((item) => ({
            raw_material_id: item.raw_material_id || item.raw_material?.id || "",
            quantity: item.quantity || 1,
          }))
        : [];

      reset({
        product_type: initialData.product_type || "prepared",
        category_id: initialData.category_id || "",
        name: initialData.name || "",
        description: initialData.description || "",
        price_usd: initialData.price_usd || 0,
        image_url: initialData.image_url || "",
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
        is_sold_out: initialData.is_sold_out !== undefined ? initialData.is_sold_out : false,
        min_stock: initialData.min_stock || 0,
        recipe_items: recipeItems,
      });
    }
  }, [initialData, reset]);

  const handleSubmitForm = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
      <div className="space-y-4">
        <Label>Tipo de Producto *</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="prepared"
              {...register("product_type")}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <span>Preparado (con receta)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="retail"
              {...register("product_type")}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <span>Retail (stock propio)</span>
          </label>
        </div>
        {errors.product_type && (
          <p className="text-sm text-destructive">{errors.product_type.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Ej: Hamburguesa Clásica, Papas Fritas"
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Descripción del producto para el catálogo..."
          rows={3}
          disabled={isLoading}
        />
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
              items={categories.map((cat) => ({
                value: String(cat.id),
                label: cat.name?.es || cat.name,
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name?.es || cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.category_id && (
          <p className="text-sm text-destructive">{errors.category_id.message}</p>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <Label htmlFor="price_usd">Precio USD *</Label>
        <Input
          id="price_usd"
          type="number"
          step="0.01"
          min="0"
          {...register("price_usd", { valueAsNumber: true })}
          placeholder="Ej: 5.00"
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
              folder="products"
              label="Imagen del producto"
            />
          )}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Estado</Label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={isActive}
              onCheckedChange={(checked) => setValue("is_active", !!checked)}
              disabled={isLoading}
            />
            <span>Activo (visible en catálogo)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={watch("is_sold_out")}
              onCheckedChange={(checked) => setValue("is_sold_out", !!checked)}
              disabled={isLoading}
            />
            <span>Agotado</span>
          </label>
        </div>
      </div>

      {productType === "retail" && (
        <>
          <Separator />
          <div className="space-y-4">
            <Label htmlFor="min_stock">Stock Mínimo</Label>
            <Input
              id="min_stock"
              type="number"
              min="0"
              step="0.001"
              {...register("min_stock", { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.min_stock && (
              <p className="text-sm text-destructive">{errors.min_stock.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              El stock actual se gestiona desde el módulo de Inventario.
            </p>
          </div>
        </>
      )}

      {productType === "prepared" && (
        <>
          <Separator />
          <RecipeEditor
            fields={fields}
            append={append}
            remove={remove}
            rawMaterials={rawMaterials}
            errors={errors}
            isLoading={isLoading}
            setValue={setValue}
            control={control}
          />
        </>
      )}

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
