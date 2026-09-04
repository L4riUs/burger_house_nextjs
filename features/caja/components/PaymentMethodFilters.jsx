"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Search } from "lucide-react";

const CURRENCY_ITEMS = [
  { value: "all", label: "Todas" },
  { value: "VES", label: "Bolívares (VES)" },
  { value: "USD", label: "Dólares (USD)" },
];

const STATUS_ITEMS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

export function PaymentMethodFilters({ filters, onChange }) {
  const currencyLabel = CURRENCY_ITEMS.find((o) => o.value === (filters.currency || "all"))?.label || "Todas";
  const statusLabel = STATUS_ITEMS.find((o) => o.value === (filters.status || "all"))?.label || "Todos";
  const hasActive = (filters.search || "") || (filters.currency && filters.currency !== "all") || (filters.status && filters.status !== "all");
  const clearAll = () => onChange({ search: "", currency: "all", status: "all" });

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre..." value={filters.search || ""} onChange={(e) => onChange({ ...filters, search: e.target.value })} className="pl-10" />
        </div>

        <Select
          value={filters.currency || "all"}
          onValueChange={(v) => onChange({ ...filters, currency: v })}
          items={CURRENCY_ITEMS}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas">{currencyLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_ITEMS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) => onChange({ ...filters, status: v })}
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos">{statusLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActive && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearAll}>
            <X className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}