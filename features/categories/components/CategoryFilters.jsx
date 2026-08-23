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

const APPLIES_TO_FILTERS = [
  { value: "all", label: "Todos los tipos" },
  { value: "product", label: "Productos" },
  { value: "raw_material", label: "Materias Primas" },
];

export function CategoryFilters({ search, onSearch, appliesTo, onAppliesToChange, hasFilters }) {
  const handleSearch = useCallback((value) => {
    onSearch(value);
  }, [onSearch]);

  const handleAppliesToChange = useCallback((value) => {
    onAppliesToChange(value);
  }, [onAppliesToChange]);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={appliesTo} onValueChange={handleAppliesToChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            {APPLIES_TO_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={() => { handleSearch(""); handleAppliesToChange("all"); }}>
          <FilterXIcon className="h-4 w-4 mr-2" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}