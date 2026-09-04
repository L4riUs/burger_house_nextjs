"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es as esDateFns } from "date-fns/locale";
import { es as esDayPicker } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

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

export function TransactionFilters({ filters, onChange, typeOptions, placeholder = "Todos los tipos" }) {
  const selectedLabel = typeOptions.find((o) => o.value === filters.txn_type)?.label || placeholder;
  const hasActive = (filters.txn_type && filters.txn_type !== "all") || filters.date_from || filters.date_to;
  const clearAll = () => onChange({ txn_type: "all", date_from: "", date_to: "" });

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={filters.txn_type || "all"} onValueChange={(v) => onChange({ ...filters, txn_type: v })} items={[{ value: "all", label: placeholder }, ...typeOptions]}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{placeholder}</SelectItem>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DatePickerFilter id="txn_date_from" label="Desde" value={filters.date_from || ""} onChange={(v) => onChange({ ...filters, date_from: v })} />
          <DatePickerFilter id="txn_date_to" label="Hasta" value={filters.date_to || ""} onChange={(v) => onChange({ ...filters, date_to: v })} />
        </div>

        {hasActive && (
          <Button variant="outline" size="sm" onClick={clearAll}>
            <X className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}