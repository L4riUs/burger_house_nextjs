"use client";

import { useState, useEffect } from "react";
import { CalendarIcon, SearchIcon, UserIcon, DatabaseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { getAuditEntities, getAuditActors, getAuditActions } from "../actions";

export function AuditFilters({
  filters,
  onChange,
  className,
}) {
  const [entities, setEntities] = useState([]);
  const [actors, setActors] = useState([]);
  const [actions, setActions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(filters.date_from ? format(parseISO(filters.date_from), "yyyy-MM-dd") : "");
  const [customTo, setCustomTo] = useState(filters.date_to ? format(parseISO(filters.date_to), "yyyy-MM-dd") : "");

  const loadOptions = async () => {
    try {
      const [entitiesRes, actorsRes, actionsRes] = await Promise.all([
        getAuditEntities(),
        getAuditActors(),
        getAuditActions(),
      ]);
      if (entitiesRes.data) setEntities(entitiesRes.data);
      if (actorsRes.data) setActors(actorsRes.data);
      if (actionsRes.data) setActions(actionsRes.data);
    } catch (err) {
      console.error("[AuditFilters] Error loading options:", err);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const handleEntityChange = (value) => onChange({ ...filters, entity: value || null, page: 1 });
  const handleActorChange = (value) => onChange({ ...filters, actor_id: value || null, page: 1 });
  const handleActionChange = (value) => onChange({ ...filters, action: value || null, page: 1 });

  const handleCustomApply = () => {
    if (!customFrom || !customTo) return;
    const from = startOfDay(new Date(customFrom)).toISOString();
    const to = endOfDay(new Date(customTo)).toISOString();
    onChange({ ...filters, date_from: from, date_to: to, page: 1 });
    setDateRangeOpen(false);
  };

  const displayRange = () => {
    if (filters.date_from && filters.date_to) {
      return `${format(parseISO(filters.date_from), "dd MMM", { locale: es })} - ${format(parseISO(filters.date_to), "dd MMM yyyy", { locale: es })}`;
    }
    return "Todo el historial";
  };

  return (
    <div className={`${className} flex flex-col gap-4 md:flex-row md:items-center`}>
      <div className="flex flex-1 items-center gap-2">
        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" className="w-full sm:w-56 justify-between gap-2 h-10 px-3 py-2" />
            }
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{displayRange()}</span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" side="bottom" align="start">
            <div className="p-3 space-y-3">
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
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" size="sm" onClick={() => onChange({ ...filters, date_from: null, date_to: null, page: 1 })}>
                  Limpiar
                </Button>
                <Button className="flex-1" size="sm" onClick={handleCustomApply}>
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={filters.entity || "all"} onValueChange={handleEntityChange} disabled={loadingOptions}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            {entities.map((entity) => (
              <SelectItem key={entity} value={entity}>{entity}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.actor_id || "all"} onValueChange={handleActorChange} disabled={loadingOptions}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los actores</SelectItem>
            {actors.map((actor) => (
              <SelectItem key={actor.id} value={actor.id}>{actor.full_name} ({actor.role})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.action || "all"} onValueChange={handleActionChange} disabled={loadingOptions}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {actions.map((action) => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        {(filters.entity || filters.actor_id || filters.action || filters.date_from) && (
          <Button variant="ghost" size="sm" onClick={() => onChange({ page: 1 })}>
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}