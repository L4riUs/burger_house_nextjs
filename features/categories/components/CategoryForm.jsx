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

const APPLIES_TO_OPTIONS = [
  { value: "product", label: "Producto" },
  { value: "raw_material", label: "Materia Prima" },
];

export function CategoryForm({ initialData, onSubmit, onCancel, isLoading }) {
  const methods = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      applies_to: "product",
      sort_order: 0,
      ...initialData,
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue } = methods;

  useEffect(() => {
    if (initialData) {
      methods.reset({
        name: initialData.name || "",
        description: initialData.description || "",
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
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Ej: Bebidas, Carnes, Verduras"
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Descripción opcional"
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