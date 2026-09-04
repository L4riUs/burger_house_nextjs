"use client";

import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

export function PackageFilters({ search, onSearch }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar paquetes..." value={search} onChange={(e) => onSearch(e.target.value)} className="pl-9" />
      </div>
    </div>
  );
}
