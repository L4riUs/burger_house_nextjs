"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, SearchIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es as esDateFns } from "date-fns/locale";
import { es as esDayPicker } from "react-day-picker/locale";
import { cn } from "@/lib/utils";
import { RESERVATION_STATUS_LABELS } from "../schemas";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const DatePickerFilter = ({ id, label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <Label htmlFor={id} className="text-sm whitespace-nowrap">
      {label}
    </Label>
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            id={id}
            className={cn(
              "w-[205px] justify-start px-2.5 font-normal",
              !value && "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(parseISO(value), 'dd/MM/yyyy', { locale: esDateFns }) : 'Seleccionar fecha'}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? parseISO(value) : undefined}
          onSelect={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
          locale={esDayPicker}
        />
      </PopoverContent>
    </Popover>
  </div>
);

export function ReservationFilters({ search, onSearch, status, onStatusChange, dateFrom, onDateFromChange, dateTo, onDateToChange }) {
  const hasActiveFilters = search || status || dateFrom || dateTo;

  const clearAllFilters = () => {
    onSearch("");
    onStatusChange("");
    onDateFromChange("");
    onDateToChange("");
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full">
          <Select items={STATUS_OPTIONS} value={status || "all"} onValueChange={(v) => onStatusChange(v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DatePickerFilter id="res_date_from" label="Desde" value={dateFrom} onChange={onDateFromChange} />
          <DatePickerFilter id="res_date_to" label="Hasta" value={dateTo} onChange={onDateToChange} />
        </div>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}