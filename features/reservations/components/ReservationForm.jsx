"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es as esDateFns } from "date-fns/locale";
import { es as esDayPicker } from "react-day-picker/locale";
import { cn } from "@/lib/utils";
import { reservationSchema, RESERVATION_STATUS_LABELS } from "../schemas";
import { createGuestForReservation } from "../actions";
import { useToast } from "@/hooks/use-toast";
import { getLocalizedField } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => ({ value, label }));

const NO_VALUE = "__none__";

const TIME_SLOTS = Array.from({ length: 32 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});

export function ReservationForm({
  initialData, onSubmit, onCancel, isLoading,
  profiles = [], guests = [], tables = [], packages = [],
}) {
  const { toastSuccess, toastError } = useToast();
  const [customerType, setCustomerType] = useState(() =>
    initialData?.profile_id ? "authenticated" : "guest"
  );
  const [createGuestMode, setCreateGuestMode] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState(initialData?.guest_customer_id || "");
  const [extraGuests, setExtraGuests] = useState([]);
  const [newGuest, setNewGuest] = useState({ full_name: "", phone: "", address: "" });

  const availableGuests = [...guests, ...extraGuests];

  const {
    register, handleSubmit, formState: { errors }, reset, setValue, watch,
  } = useForm({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      customer_type: initialData?.profile_id ? "authenticated" : "guest",
      profile_id: initialData?.profile_id || "",
      guest_customer_id: initialData?.guest_customer_id || "",
      table_id: initialData?.table_id || "",
      package_id: initialData?.package_id || "",
      party_size: initialData?.party_size || 2,
      reserved_at: initialData?.reserved_at
        ? new Date(initialData.reserved_at).toISOString().slice(0, 16)
        : "",
      duration_minutes: initialData?.duration_minutes || 90,
      status: initialData?.status || "pending",
      notes: initialData?.notes || "",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        customer_type: initialData.profile_id ? "authenticated" : "guest",
        profile_id: initialData.profile_id || "",
        guest_customer_id: initialData.guest_customer_id || "",
        table_id: initialData.table_id || "",
        package_id: initialData.package_id || "",
        party_size: initialData.party_size || 2,
        reserved_at: initialData.reserved_at
          ? new Date(initialData.reserved_at).toISOString().slice(0, 16)
          : "",
        duration_minutes: initialData.duration_minutes || 90,
        status: initialData.status || "pending",
        notes: initialData.notes || "",
      });
    }
  }, [initialData, reset]);

  const handleTypeChange = (type) => {
    setCustomerType(type);
    setValue("customer_type", type);
    if (type === "authenticated") {
      setValue("guest_customer_id", "");
      setSelectedGuestId("");
    } else {
      setValue("profile_id", "");
    }
  };

  const handleCreateGuest = async () => {
    if (!newGuest.full_name || !newGuest.phone) {
      toastError("El nombre y el teléfono son requeridos");
      return;
    }
    const result = await createGuestForReservation(newGuest);
    if (result.error) { toastError(result.error); return; }
    toastSuccess(result.success);
    setExtraGuests((prev) => [
      ...prev.filter((g) => g.id !== result.data.id),
      result.data,
    ]);
    setSelectedGuestId(result.data.id);
    setValue("guest_customer_id", result.data.id);
    setCreateGuestMode(false);
    setNewGuest({ full_name: "", phone: "", address: "" });
  };

  const handleGuestSelect = (id) => {
    setSelectedGuestId(id);
    setValue("guest_customer_id", id);
  };

  const watchReservedAt = watch("reserved_at");
  const reservedDate = watchReservedAt ? watchReservedAt.slice(0, 10) : "";
  const reservedTime = watchReservedAt ? watchReservedAt.slice(11, 16) : "";

  const handleDateChange = (dateStr) => {
    const time = reservedTime || "12:00";
    setValue("reserved_at", dateStr ? `${dateStr}T${time}` : "", { shouldValidate: true });
  };

  const handleTimeChange = (value) => {
    setValue("reserved_at", reservedDate ? `${reservedDate}T${value}` : "", { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <Label>Tipo de cliente *</Label>
        <div className="flex gap-2">
          <Button
            type="button" variant={customerType === "authenticated" ? "default" : "outline"} size="sm"
            onClick={() => handleTypeChange("authenticated")}
          >
            Registrado
          </Button>
          <Button
            type="button" variant={customerType === "guest" ? "default" : "outline"} size="sm"
            onClick={() => handleTypeChange("guest")}
          >
            Invitado
          </Button>
        </div>
      </div>

      {customerType === "authenticated" ? (
        <div className="space-y-4">
          <Label>Cliente *</Label>
          <Select
            items={
              profiles.length === 0
                ? [{ value: NO_VALUE, label: "No hay clientes registrados" }]
                : [
                    { value: NO_VALUE, label: "Seleccione aquí" },
                    ...profiles.map((p) => ({ value: p.id, label: p.full_name })),
                  ]
            }
            value={watch("profile_id") || NO_VALUE}
            onValueChange={(v) => setValue("profile_id", v === NO_VALUE ? "" : v, { shouldValidate: true })}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione aquí" />
            </SelectTrigger>
            <SelectContent>
              {profiles.length === 0 ? (
                <SelectItem value={NO_VALUE} disabled>
                  No hay clientes registrados
                </SelectItem>
              ) : (
                <>
                  <SelectItem value={NO_VALUE}>Seleccione aquí</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
          {errors.profile_id && <p className="text-sm text-destructive">{errors.profile_id.message}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Cliente invitado *</Label>
            {!createGuestMode && (
              <Button type="button" variant="link" size="sm" onClick={() => setCreateGuestMode(true)}>
                Crear nuevo
              </Button>
            )}
          </div>

          {createGuestMode ? (
            <div className="space-y-3 rounded-md border p-4">
              <Input placeholder="Nombre completo" value={newGuest.full_name}
                onChange={(e) => setNewGuest({ ...newGuest, full_name: e.target.value })} />
              <Input placeholder="Teléfono" value={newGuest.phone}
                onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })} />
              <Input placeholder="Dirección (opcional)" value={newGuest.address || ""}
                onChange={(e) => setNewGuest({ ...newGuest, address: e.target.value })} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateGuestMode(false)}>Cancelar</Button>
                <Button type="button" size="sm" onClick={handleCreateGuest}>Guardar invitado</Button>
              </div>
            </div>
          ) : (
            <Select
              value={selectedGuestId || NO_VALUE}
              items={[
                { value: NO_VALUE, label: "Seleccione aquí" },
                ...availableGuests.map((g) => ({ value: g.id, label: `${g.full_name} (${g.phone || "sin teléfono"})` })),
              ]}
              onValueChange={(v) => handleGuestSelect(v === NO_VALUE ? "" : v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione aquí" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_VALUE}>Seleccione aquí</SelectItem>
                {availableGuests.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.full_name} ({g.phone || "sin teléfono"})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.customer_type && <p className="text-sm text-destructive">{errors.customer_type.message}</p>}
        </div>
      )}

      <div className="space-y-4">
        <Label>Mesa o paquete *</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Select
              items={[
                { value: NO_VALUE, label: "Sin mesa específica" },
                ...tables.map((t) => ({ value: t.id, label: `${t.name} (Cap: ${t.capacity})` })),
              ]}
              value={watch("table_id") || NO_VALUE}
              onValueChange={(v) => setValue("table_id", v === NO_VALUE ? "" : v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin mesa específica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_VALUE}>Sin mesa específica</SelectItem>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} (Cap: {t.capacity})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Select
              items={[
                { value: NO_VALUE, label: "Sin paquete" },
                ...packages.map((p) => ({ value: p.id, label: `${getLocalizedField(p.name, "es") || p.name} (Cap: ${p.capacity})` })),
              ]}
              value={watch("package_id") || NO_VALUE}
              onValueChange={(v) => setValue("package_id", v === NO_VALUE ? "" : v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin paquete" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_VALUE}>Sin paquete</SelectItem>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{getLocalizedField(p.name, "es") || p.name} (Cap: {p.capacity})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {errors.table_id && <p className="text-sm text-destructive">{errors.table_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <Label htmlFor="party_size">Personas *</Label>
          <Input id="party_size" type="number" min="1" {...register("party_size", { valueAsNumber: true })} disabled={isLoading} />
          {errors.party_size && <p className="text-sm text-destructive">{errors.party_size.message}</p>}
        </div>
        <div className="space-y-4">
          <Label htmlFor="duration_minutes">Duración (min) *</Label>
          <Input id="duration_minutes" type="number" min="15" step="15" {...register("duration_minutes", { valueAsNumber: true })} disabled={isLoading} />
          {errors.duration_minutes && <p className="text-sm text-destructive">{errors.duration_minutes.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <Label htmlFor="reserved_at">Fecha y hora *</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  id="reserved_at"
                  className={cn(
                    "w-full sm:w-[210px] justify-start px-2.5 font-normal",
                    !reservedDate && "text-muted-foreground"
                  )}
                />
              }
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {reservedDate ? format(parseISO(reservedDate), 'dd/MM/yyyy', { locale: esDateFns }) : 'Seleccionar fecha'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={reservedDate ? parseISO(reservedDate) : undefined}
                onSelect={(date) => handleDateChange(date ? format(date, 'yyyy-MM-dd') : '')}
                locale={esDayPicker}
              />
            </PopoverContent>
          </Popover>
          <Select value={reservedTime || NO_VALUE} items={[
              { value: NO_VALUE, label: "Seleccione aquí" },
              ...TIME_SLOTS.map((slot) => ({ value: slot, label: slot })),
            ]} onValueChange={(v) => { if (v !== NO_VALUE) handleTimeChange(v); }} disabled={isLoading}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Seleccione aquí" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_VALUE}>Seleccione aquí</SelectItem>
              {TIME_SLOTS.map((slot) => (
                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {errors.reserved_at && <p className="text-sm text-destructive">{errors.reserved_at.message}</p>}
      </div>

      <div className="space-y-4">
        <Label htmlFor="status">Estado</Label>
        <Select
          items={STATUS_OPTIONS}
          value={watch("status") || "pending"}
          onValueChange={(value) => setValue("status", value)}
          disabled={isLoading}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" {...register("notes")} rows={3} disabled={isLoading} />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : initialData ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}