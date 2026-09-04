"use client";

import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";
import { TABLE_STATUS_LABELS } from "../schemas";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...Object.entries(TABLE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function TableFilters({
  search, onSearch, status, onStatusChange,
  zone, onZoneChange, zones = [],
}) {
  const zoneOptions = [
    { value: "all", label: "Todas las zonas" },
    ...zones.map((z) => ({ value: z, label: z })),
  ];

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar mesa..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select items={STATUS_OPTIONS} value={status || "all"} onValueChange={(v) => onStatusChange(v === "all" ? "" : v)}>
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Todos los estados" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={zoneOptions} value={zone || "all"} onValueChange={(v) => onZoneChange(v === "all" ? "" : v)}>
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Todas las zonas" />
        </SelectTrigger>
        <SelectContent>
          {zoneOptions.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}