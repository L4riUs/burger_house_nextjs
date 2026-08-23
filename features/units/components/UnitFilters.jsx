"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon, FilterXIcon } from "lucide-react";

const UNIT_TYPE_FILTERS = [
  { value: "all", label: "Todos los tipos" },
  { value: "mass", label: "Masa" },
  { value: "volume", label: "Volumen" },
  { value: "count", label: "Conteo" },
];

export function UnitFilters({ search, onSearch, unitType, onUnitTypeChange, hasFilters }) {
  const handleSearch = useCallback((value) => {
    onSearch(value);
  }, [onSearch]);

  const handleUnitTypeChange = useCallback((value) => {
    onUnitTypeChange(value);
  }, [onUnitTypeChange]);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o abreviatura..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={unitType} onValueChange={handleUnitTypeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            {UNIT_TYPE_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={() => { handleSearch(""); handleUnitTypeChange("all"); }}>
          <FilterXIcon className="h-4 w-4 mr-2" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}