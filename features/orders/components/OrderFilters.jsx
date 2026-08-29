"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, X, Search, Filter as FilterIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
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
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            <span>{selected.length ? selectedLabels : placeholder}</span>
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
    onChange({
      ...filters,
      search: '',
      date_from: '',
      date_to: '',
      status: [],
      fulfillment_type: [],
      channel: [],
    });
  };

  return (
    <div className="space-y-4 p-4 bg-card border rounded-lg">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-xs">
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

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label className="text-sm font-medium">Fecha desde</Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                />
              }
            >
              <Calendar className="mr-2 h-4 w-4" />
              {dateFrom ? format(parseISO(dateFrom), 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" side="bottom" align="start">
              <Calendar
                mode="single"
                selected={dateFrom ? parseISO(dateFrom) : undefined}
                onSelect={setDateFrom}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1">
          <Label className="text-sm font-medium">Fecha hasta</Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                />
              }
            >
              <Calendar className="mr-2 h-4 w-4" />
              {dateTo ? format(parseISO(dateTo), 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" side="bottom" align="start">
              <Calendar
                mode="single"
                selected={dateTo ? parseISO(dateTo) : undefined}
                onSelect={setDateTo}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            {status.length} estado(s), {fulfillment.length} tipo(s), {channel.length} canal(es)
          </span>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}