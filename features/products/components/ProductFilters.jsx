"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";

export function ProductFilters({
  search,
  onSearch,
  categoryId,
  onCategoryIdChange,
  productType,
  onProductTypeChange,
  categories = [],
  hasFilters,
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={categoryId || "all"}
        onValueChange={(value) => onCategoryIdChange(value === "all" ? "" : value)}
      >
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Todas las categorías" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name?.es || cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={productType || "all"}
        onValueChange={(value) => onProductTypeChange(value === "all" ? "" : value)}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Todos los tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="prepared">Preparados</SelectItem>
          <SelectItem value="retail">Retail</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
