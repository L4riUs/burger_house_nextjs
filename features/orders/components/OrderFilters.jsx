"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon, X, Search, Filter as FilterIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es as esDateFns } from "date-fns/locale";
import { es as esDayPicker } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

const MultiSelectFilter = ({ label, options, selected, onChange, placeholder = "Todos" }) => {
  const [open, setOpen] = useState(false);

  const handleToggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = options
    .filter(o => selected.includes(o.value))
    .map(o => o.label)
    .join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-10 w-full justify-between py-2 pr-10"
            />
          }
        >
          <div className="flex items-center gap-2 truncate">
            <FilterIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{selected.length ? selectedLabels : placeholder}</span>
          </div>
        </PopoverTrigger>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 p-0"
            onClick={() => onChange([])}
            aria-label={`Limpiar filtro de ${label}`}
            title={`Limpiar filtro de ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <PopoverContent className="w-64 p-2" side="bottom" align="start">
        <div className="space-y-1">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md cursor-pointer">
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

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

export function OrderFilters({ filters, onChange, statusOptions, fulfillmentOptions, channelOptions }) {
  const [search, setSearch] = useState(filters.search || '');
  const [dateFrom, setDateFrom] = useState(filters.date_from || '');
  const [dateTo, setDateTo] = useState(filters.date_to || '');
  const [status, setStatus] = useState(filters.status || []);
  const [fulfillment, setFulfillment] = useState(filters.fulfillment_type || []);
  const [channel, setChannel] = useState(filters.channel || []);

  useEffect(() => {
    onChange({
      search,
      date_from: dateFrom,
      date_to: dateTo,
      status,
      fulfillment_type: fulfillment,
      channel,
    });
  }, [search, dateFrom, dateTo, status, fulfillment, channel, onChange]);

  const hasActiveFilters = status.length || fulfillment.length || channel.length || dateFrom || dateTo || search;

  const clearAllFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatus([]);
    setFulfillment([]);
    setChannel([]);
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por #orden, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <MultiSelectFilter
          label="Estado"
          options={statusOptions}
          selected={status}
          onChange={setStatus}
          placeholder="Todos los estados"
        />

        <MultiSelectFilter
          label="Tipo entrega"
          options={fulfillmentOptions}
          selected={fulfillment}
          onChange={setFulfillment}
          placeholder="Todos los tipos"
        />

        <MultiSelectFilter
          label="Canal"
          options={channelOptions}
          selected={channel}
          onChange={setChannel}
          placeholder="Todos los canales"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DatePickerFilter
            id="date_from"
            label="Desde"
            value={dateFrom}
            onChange={setDateFrom}
          />
          <DatePickerFilter
            id="date_to"
            label="Hasta"
            value={dateTo}
            onChange={setDateTo}
          />
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