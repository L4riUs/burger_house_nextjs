"use client";

import { useCallback, useEffect, useState } from "react";
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
import { listCategoriesForRawMaterials } from "../actions";

export function RawMaterialFilters({ search, onSearch, categoryId, onCategoryIdChange, hasFilters, lowStockOnly, onLowStockOnlyChange }) {
  const [categories, setCategories] = useState([]);

  const handleSearch = useCallback((value) => {
    onSearch(value);
  }, [onSearch]);

  const handleCategoryIdChange = useCallback((value) => {
    onCategoryIdChange(value);
  }, [onCategoryIdChange]);

  useEffect(() => {
    const fetchCategories = async () => {
      const result = await listCategoriesForRawMaterials();
      if (!result.error) {
        setCategories(result.data || []);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryId} onValueChange={handleCategoryIdChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name?.es || cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => onLowStockOnlyChange(e.target.checked)}
            className="rounded border-input"
          />
          <span className="text-sm">Solo stock bajo</span>
        </label>
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={() => { handleSearch(""); handleCategoryIdChange(""); onLowStockOnlyChange(false); }}>
          <FilterXIcon className="h-4 w-4 mr-2" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}