"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

const PRESETS = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "last_7_days", label: "Últimos 7 días" },
  { value: "last_30_days", label: "Últimos 30 días" },
  { value: "this_month", label: "Este mes" },
  { value: "last_month", label: "Mes anterior" },
  { value: "custom", label: "Personalizado" },
];

export function DashboardFilters({
  preset,
  dateFrom,
  dateTo,
  onChange,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [customFrom, setCustomFrom] = useState(dateFrom ? format(parseISO(dateFrom), "yyyy-MM-dd") : "");
  const [customTo, updateCustomTo] = useState(
    dateTo ? format(parseISO(dateTo), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );

  const handlePresetChange = (value) => {
    onChange({ preset: value, date_from: null, date_to: null });
    if (value !== "custom") setOpen(false);
  };

  const handleCustomApply = () => {
    if (!customFrom || !customTo) return;
    const from = startOfDay(new Date(customFrom)).toISOString();
    const to = endOfDay(new Date(customTo)).toISOString();
    onChange({ preset: "custom", date_from: from, date_to: to });
    setOpen(false);
  };

  const displayRange = () => {
    if (preset === "custom" && dateFrom && dateTo) {
      return `${format(parseISO(dateFrom), "dd MMM", { locale: es })} - ${format(parseISO(dateTo), "dd MMM yyyy", { locale: es })}`;
    }
    const p = PRESETS.find((x) => x.value === preset);
    return p?.label || "Últimos 30 días";
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" className="w-full justify-between gap-2 h-10 px-3 py-2" />
          }
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{displayRange()}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" side="bottom" align="start">
          <div className="p-3 space-y-3">
            <div className="grid gap-1">
              {PRESETS.map((p) => (
                <Button
                  key={p.value}
                  variant={preset === p.value ? "default" : "ghost"}
                  className="justify-start w-full gap-2"
                  onClick={() => handlePresetChange(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="space-y-2 pt-2 border-t">
                <div className="grid gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Desde</label>
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Hasta</label>
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => updateCustomTo(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <Button className="w-full" size="sm" onClick={handleCustomApply}>
                  Aplicar
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}