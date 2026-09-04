"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es as esDateFns } from "date-fns/locale";
import { es as esDayPicker } from "react-day-picker/locale";
import { cn } from "@/lib/utils";
import { listRawMaterialsForMovement } from "../actions";
import { getMovementTypeOptions } from "../lib/movement-utils";

function DatePickerFilter({ id, label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" id={id} className={cn("w-[190px] justify-start px-2.5 font-normal", !value && "text-muted-foreground")} />
          }
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(parseISO(value), "dd/MM/yyyy", { locale: esDateFns }) : "Seleccionar fecha"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? parseISO(value) : undefined}
            onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
            locale={esDayPicker}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const ITEM_TYPE_OPTIONS = [
  { value: "all", label: "Todos los tipos de ítem" },
  { value: "raw_material", label: "Materias Primas" },
];

export function MovementFilters({ filters, onFiltersChange, hasFilters }) {
  const [rawMaterials, setRawMaterials] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchMaterials = async () => {
      const result = await listRawMaterialsForMovement();
      if (!cancelled && !result.error) {
        setRawMaterials(result.data || []);
      }
    };
    fetchMaterials();
    return () => { cancelled = true; };
  }, []);

  const movementOptions = getMovementTypeOptions();
  const movementItems = [{ value: "all", label: "Todos los tipos" }, ...movementOptions];

  const selectedItemTypeLabel = [...ITEM_TYPE_OPTIONS, { value: "product", label: "Productos Retail (Fase 4)" }]
    .find((o) => o.value === (filters.itemType || "all"))?.label || "Todos los tipos de ítem";
  const selectedMovementLabel = movementItems.find((o) => o.value === (filters.movementType || "all"))?.label || "Todos los tipos";
  const selectedMaterialLabel = rawMaterials.find((m) => m.id === filters.itemId)?.name || "";

  const clearAll = () => onFiltersChange({ search: "", itemType: "all", movementType: "all", dateFrom: "", dateTo: "", itemId: "" });

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de ítem..."
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        <Select
          value={filters.itemType || "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, itemType: v, itemId: v === "all" ? "" : filters.itemId })}
          items={ITEM_TYPE_OPTIONS}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos los tipos de ítem">{selectedItemTypeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[...ITEM_TYPE_OPTIONS, { value: "product", label: "Productos Retail (Fase 4)" }].map((opt) => (
              <SelectItem key={opt.value} value={opt.value} disabled={opt.value === "product"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.movementType || "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, movementType: v })}
          items={movementItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos los tipos">{selectedMovementLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {movementItems.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filters.itemType === "raw_material" && (
          <Select
            value={filters.itemId || ""}
            onValueChange={(v) => onFiltersChange({ ...filters, itemId: v })}
            items={[{ value: "", label: "Todas las materias primas" }, ...rawMaterials.map((m) => ({ value: m.id, label: m.name }))]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas las materias primas">{selectedMaterialLabel || "Todas las materias primas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las materias primas</SelectItem>
              {rawMaterials.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DatePickerFilter id="mov_date_from" label="Desde" value={filters.dateFrom || ""} onChange={(v) => onFiltersChange({ ...filters, dateFrom: v })} />
          <DatePickerFilter id="mov_date_to" label="Hasta" value={filters.dateTo || ""} onChange={(v) => onFiltersChange({ ...filters, dateTo: v })} />
        </div>

        {hasFilters && (
          <Button variant="outline" size="sm" onClick={() => onFiltersChange({ search: "", itemType: "all", movementType: "all", dateFrom: "", dateTo: "", itemId: "" })}>
            <X className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}