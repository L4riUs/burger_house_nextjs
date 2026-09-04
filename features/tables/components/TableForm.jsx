"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { tableFormSchema } from "../schemas";

const TABLE_STATUS_OPTIONS = [
  { value: "available", label: "Disponible" },
  { value: "occupied", label: "Ocupada" },
  { value: "reserved", label: "Reservada" },
  { value: "out_of_service", label: "Fuera de servicio" },
];

export function TableForm({ initialData, onSubmit, onCancel, isLoading }) {
  const {
    register, handleSubmit, formState: { errors }, reset, setValue, watch, control,
  } = useForm({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: "",
      capacity: 4,
      zone: "",
      status: "available",
      is_vip: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        capacity: initialData.capacity || 4,
        zone: initialData.zone || "",
        status: initialData.status || "available",
        is_vip: initialData.is_vip || false,
      });
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="name">Nombre *</Label>
        <Input id="name" {...register("name")} placeholder="Ej: Mesa 1" disabled={isLoading} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="capacity">Capacidad *</Label>
        <Input id="capacity" type="number" min="1" {...register("capacity", { valueAsNumber: true })} disabled={isLoading} />
        {errors.capacity && <p className="text-sm text-destructive">{errors.capacity.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="zone">Zona</Label>
        <Input id="zone" {...register("zone")} placeholder="Ej: Terraza, Interior, VIP" disabled={isLoading} />
      </div>

      <div className="space-y-4">
        <Label>Estado</Label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select value={field.value} items={TABLE_STATUS_OPTIONS} onValueChange={field.onChange} disabled={isLoading}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                {TABLE_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-4">
        <Label>Opciones</Label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={watch("is_vip")}
            onCheckedChange={(v) => setValue("is_vip", !!v)}
            disabled={isLoading}
          />
          <span>Mesa VIP</span>
        </label>
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
