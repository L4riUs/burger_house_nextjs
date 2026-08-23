"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { categoryFormSchema } from "../schemas";
import { getLocalizedField } from "@/lib/i18n";

const APPLIES_TO_OPTIONS = [
  { value: "product", label: "Producto" },
  { value: "raw_material", label: "Materia Prima" },
];

export function CategoryForm({ initialData, onSubmit, onCancel, isLoading }) {
  const methods = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: { es: "", en: "" },
      description: { es: "", en: "" },
      applies_to: "product",
      sort_order: 0,
      ...initialData,
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue } = methods;

  useEffect(() => {
    if (initialData) {
      methods.reset({
        name: initialData.name || { es: "", en: "" },
        description: initialData.description || { es: "", en: "" },
        applies_to: initialData.applies_to || "product",
        sort_order: initialData.sort_order || 0,
      });
    }
  }, [initialData, methods]);

  const handleSubmitForm = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="name_es">Nombre (Español) *</Label>
        <Input
          id="name_es"
          {...register("name.es")}
          placeholder="Ej: Bebidas, Carnes, Verduras"
          disabled={isLoading}
        />
        {errors.name?.es && (
          <p className="text-sm text-destructive">{errors.name.es.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <Label htmlFor="name_en">Nombre (Inglés)</Label>
        <Input
          id="name_en"
          {...register("name.en")}
          placeholder="Ej: Drinks, Meats, Vegetables"
          disabled={isLoading}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <Label htmlFor="description_es">Descripción (Español)</Label>
        <Textarea
          id="description_es"
          {...register("description.es")}
          placeholder="Descripción opcional en español"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-4">
        <Label htmlFor="description_en">Descripción (Inglés)</Label>
        <Textarea
          id="description_en"
          {...register("description.en")}
          placeholder="Optional description in English"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Tipo de Categoría *</Label>
        <Select
          {...register("applies_to")}
          onValueChange={(value) => setValue("applies_to", value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            {APPLIES_TO_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.applies_to && (
          <p className="text-sm text-destructive">{errors.applies_to.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <Label htmlFor="sort_order">Orden de Visualización</Label>
        <Input
          id="sort_order"
          type="number"
          min="0"
          {...register("sort_order", { valueAsNumber: true })}
          disabled={isLoading}
        />
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