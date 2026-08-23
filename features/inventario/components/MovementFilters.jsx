"use client";

import { useCallback, useState, useEffect } from "react";
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
import { SearchIcon, FilterXIcon, CalendarIcon } from "lucide-react";
import { listRawMaterialsForMovement } from "../actions";
import { MOVEMENT_TYPES, getAllMovementTypes, getMovementTypeLabel } from "../lib/movement-utils";

export function MovementFilters({ 
  filters, 
  onFiltersChange, 
  hasFilters 
}) {
  const [rawMaterials, setRawMaterials] = useState([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      const result = await listRawMaterialsForMovement();
      if (!result.error) {
        setRawMaterials(result.data || []);
      }
    };
    fetchMaterials();
  }, []);

  const handleChange = useCallback((key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  // Get display label for selected itemId
  const selectedItemLabel = rawMaterials.find(m => m.id === filters.itemId)?.name || "";

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de ítem..."
            value={filters.search || ""}
            onChange={(e) => handleChange("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filters.itemType || "all"} onValueChange={(value) => handleChange("itemType", value)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo de ítem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="raw_material">Materias Primas</SelectItem>
            <SelectItem value="product" disabled>Productos Retail (Fase 4)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.movementType || "all"} onValueChange={(value) => handleChange("movementType", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de movimiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {getAllMovementTypes().map((type) => (
              <SelectItem key={type} value={type}>
                {getMovementTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Label htmlFor="date_from" className="text-sm">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Desde
          </Label>
          <Input
            id="date_from"
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => handleChange("dateFrom", e.target.value)}
            className="w-[160px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="date_to" className="text-sm">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Hasta
          </Label>
          <Input
            id="date_to"
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => handleChange("dateTo", e.target.value)}
            className="w-[160px]"
          />
        </div>

        {filters.itemType === "raw_material" && (
          <Select value={filters.itemId || ""} onValueChange={(value) => handleChange("itemId", value)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Materia prima específica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las materias primas</SelectItem>
              {rawMaterials.map((material) => (
                <SelectItem key={material.id} value={material.id}>
                  {material.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filters.itemType === "raw_material" && filters.itemId && selectedItemLabel && (
          <span className="text-xs text-muted-foreground">Seleccionado: {selectedItemLabel}</span>
        )}
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={() => onFiltersChange({})}>
          <FilterXIcon className="h-4 w-4 mr-2" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}