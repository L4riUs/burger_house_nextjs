"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { unitFormSchema } from "../schemas";

const UNIT_TYPE_OPTIONS = [
  { value: "mass", label: "Masa (kg, g, etc.)" },
  { value: "volume", label: "Volumen (l, ml, etc.)" },
  { value: "count", label: "Unidad/Conteo (un, docena, etc.)" },
];

export function UnitForm({ initialData, onSubmit, onCancel, isLoading }) {
  const methods = useForm({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      unit_type: "mass",
      conversion_factor: 1,
      is_base_unit: false,
      ...initialData,
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = methods;

  useEffect(() => {
    if (initialData) {
      methods.reset({
        name: initialData.name || "",
        abbreviation: initialData.abbreviation || "",
        unit_type: initialData.unit_type || "mass",
        conversion_factor: initialData.conversion_factor || 1,
        is_base_unit: initialData.is_base_unit || false,
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
          placeholder="Ej: Kilogramo, Litro, Unidad"
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="abbreviation">Abreviatura *</Label>
        <Input
          id="abbreviation"
          {...register("abbreviation")}
          placeholder="Ej: kg, l, un"
          disabled={isLoading}
        />
        {errors.abbreviation && <p className="text-sm text-destructive">{errors.abbreviation.message}</p>}
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Tipo de Unidad *</Label>
        <Select
          {...register("unit_type")}
          onValueChange={(value) => setValue("unit_type", value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            {UNIT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.unit_type && <p className="text-sm text-destructive">{errors.unit_type.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="conversion_factor">Factor de Conversión *</Label>
        <Input
          id="conversion_factor"
          type="number"
          step="0.000001"
          min="0.000001"
          {...register("conversion_factor", { valueAsNumber: true })}
          placeholder="Ej: 1000 (para kg→g), 1 (unidad base)"
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Factor respecto a la unidad base de su tipo. Unidad base = 1.
        </p>
        {errors.conversion_factor && <p className="text-sm text-destructive">{errors.conversion_factor.message}</p>}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="is_base_unit"
            {...register("is_base_unit")}
            disabled={isLoading}
          />
          <Label htmlFor="is_base_unit" className="cursor-pointer">
            Es unidad base de su tipo
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Solo puede haber una unidad base por tipo (masa, volumen, conteo).
        </p>
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