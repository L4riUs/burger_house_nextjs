"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { TrashIcon, PlusIcon } from "lucide-react";
import { packageSchema } from "../schemas";

export function PackageForm({ initialData, onSubmit, onCancel, isLoading, tables = [] }) {
  const {
    register, handleSubmit, formState: { errors }, reset, control,
  } = useForm({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: { es: "", en: "" },
      description: { es: "", en: "" },
      price_usd: 0,
      capacity: 10,
      package_tables: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "package_tables" });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || { es: "", en: "" },
        description: initialData.description || { es: "", en: "" },
        price_usd: initialData.price_usd || 0,
        capacity: initialData.capacity || 10,
        package_tables: initialData.package_tables || [],
      });
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="name_es">Nombre (Español) *</Label>
        <Input id="name_es" {...register("name.es")} placeholder="Ej: Paquete Cumpleaños" disabled={isLoading} />
        {errors.name?.es && <p className="text-sm text-destructive">{errors.name.es.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="name_en">Nombre (Inglés)</Label>
        <Input id="name_en" {...register("name.en")} placeholder="Ej: Birthday Package" disabled={isLoading} />
      </div>

      <Separator />

      <div className="space-y-4">
        <Label htmlFor="description_es">Descripción (Español)</Label>
        <Textarea id="description_es" {...register("description.es")} rows={3} placeholder="Descripción opcional en español" disabled={isLoading} />
      </div>

      <div className="space-y-4">
        <Label htmlFor="description_en">Descripción (Inglés)</Label>
        <Textarea id="description_en" {...register("description.en")} rows={3} placeholder="Optional description in English" disabled={isLoading} />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <Label htmlFor="price_usd">Precio USD *</Label>
          <Input id="price_usd" type="number" step="0.01" min="0" {...register("price_usd", { valueAsNumber: true })} disabled={isLoading} />
          {errors.price_usd && <p className="text-sm text-destructive">{errors.price_usd.message}</p>}
        </div>
        <div className="space-y-4">
          <Label htmlFor="capacity">Capacidad *</Label>
          <Input id="capacity" type="number" min="1" {...register("capacity", { valueAsNumber: true })} disabled={isLoading} />
          {errors.capacity && <p className="text-sm text-destructive">{errors.capacity.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Mesas del paquete *</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
            <select
              {...register(`package_tables.${index}.table_id`)}
              className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              disabled={isLoading}
            >
              <option value="">Seleccionar mesa</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>{t.name} (Cap: {t.capacity})</option>
              ))}
            </select>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={isLoading}>
              <TrashIcon className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ table_id: "" })} disabled={isLoading}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Agregar mesa
        </Button>
        {errors.package_tables && <p className="text-sm text-destructive">{errors.package_tables.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : initialData ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}