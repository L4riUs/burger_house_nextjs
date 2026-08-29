"use client";

import { Controller, useWatch } from "react-hook-form";
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
import { PlusIcon, TrashIcon } from "lucide-react";

export function RecipeEditor({ fields, append, remove, rawMaterials, errors, isLoading, setValue, control }) {
  const getRawMaterialUnit = (rawMaterialId) => {
    const rm = rawMaterials.find((m) => String(m.id) === String(rawMaterialId));
    return rm?.unit?.abbreviation || "un";
  };

  const getRawMaterialUnitType = (rawMaterialId) => {
    const rm = rawMaterials.find((m) => String(m.id) === String(rawMaterialId));
    return rm?.unit?.unit_type || "mass";
  };

  const recipeItemsValues = useWatch({
    control,
    name: "recipe_items",
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Receta (Materias Primas) *</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ raw_material_id: "", quantity: 1, unit_id: "" })}
          disabled={isLoading}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {errors?.recipe_items?.message && (
        <p className="text-sm text-destructive">{errors.recipe_items.message}</p>
      )}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          No hay materias primas agregadas. Haga clic en "Agregar" para comenzar.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex-1 space-y-1">
              {index === 0 && <Label className="text-xs text-muted-foreground">Materia Prima</Label>}
              <Controller
                name={`recipe_items.${index}.raw_material_id`}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Select
                    value={value ? String(value) : undefined}
                    onValueChange={onChange}
                    disabled={isLoading}
                    items={rawMaterials.map((rm) => ({
                      value: String(rm.id),
                      label: `${rm.name} (${rm.unit?.abbreviation || "un"})`,
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona materia prima" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map((rm) => (
                        <SelectItem key={rm.id} value={String(rm.id)}>
                          {rm.name} ({rm.unit?.abbreviation || "un"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors?.recipe_items?.[index]?.raw_material_id && (
                <p className="text-xs text-destructive">
                  {errors.recipe_items[index].raw_material_id.message}
                </p>
              )}
            </div>

            <div className="w-28 space-y-1">
              {index === 0 && <Label className="text-xs text-muted-foreground">Cantidad</Label>}
              <Controller
                name={`recipe_items.${index}.quantity`}
                control={control}
                render={({ field: { value, onChange, ref } }) => (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={value ?? ""}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        onChange(isNaN(parsed) ? "" : parsed);
                      }}
                      disabled={isLoading}
                      className="w-20"
                      ref={ref}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {getRawMaterialUnit(recipeItemsValues[index]?.raw_material_id || field.raw_material_id)}
                    </span>
                  </div>
                )}
              />
              {errors?.recipe_items?.[index]?.quantity && (
                <p className="text-xs text-destructive">
                  {errors.recipe_items[index].quantity.message}
                </p>
              )}
            </div>

            <div className="w-36 space-y-1">
              {index === 0 && <Label className="text-xs text-muted-foreground">Unidad</Label>}
              <Controller
                name={`recipe_items.${index}.unit_id`}
                control={control}
                render={({ field: { value, onChange } }) => {
                  const rawMaterialId = recipeItemsValues[index]?.raw_material_id || field.raw_material_id;
                  const unitType = getRawMaterialUnitType(rawMaterialId);
                  const allUnits = [...new Map(
                    rawMaterials
                      .filter((rm) => rm.unit?.unit_type === unitType)
                      .map((rm) => [rm.unit?.id, rm.unit])
                  ).values()].filter(Boolean);
                  
                  return (
                    <Select
                      value={value ? String(value) : undefined}
                      onValueChange={onChange}
                      disabled={isLoading}
                      items={allUnits.map((u) => ({
                        value: String(u.id),
                        label: `${u.name} (${u.abbreviation})`,
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUnits.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name} ({u.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {errors?.recipe_items?.[index]?.unit_id && (
                <p className="text-xs text-destructive">
                  {errors.recipe_items[index].unit_id.message}
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
  );
}
