"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CircleUserRound, Search, UserRound, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "../store";

export function PosCustomerSelector() {
  const customerType = usePosStore((state) => state.customerType);
  const customer = usePosStore((state) => state.customer);
  const setCustomerType = usePosStore((state) => state.setCustomerType);
  const setCustomer = usePosStore((state) => state.setCustomer);

  const [profiles, setProfiles] = useState([]);
  const [guestCustomers, setGuestCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      setLoading(true);
      const supabase = createClient();
      const [profilesRes, guestsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").order("full_name"),
        supabase
          .from("guest_customers")
          .select("id, full_name, phone, address")
          .is("deleted_at", null)
          .order("full_name"),
      ]);

      if (active) {
        setProfiles(profilesRes.data || []);
        setGuestCustomers(guestsRes.data || []);
        setLoading(false);
      }
    }

    loadCustomers();
    return () => {
      active = false;
    };
  }, []);

  const query = search.trim().toLowerCase();

  const filteredProfiles = profiles.filter((p) => {
    if (!query) return true;
    return [p.full_name, p.phone].filter(Boolean).some((v) => v.toLowerCase().includes(query));
  });

  // Incluye el guest anónimo 'Cliente mostrador' en el buscador solo si tiene
  // otros pedidos; pero no listarlo como "cliente registrado". Se excluye.
  const filteredGuests = guestCustomers.filter((g) => {
    if (g.full_name === "Cliente mostrador" && g.phone === "-") return false;
    if (!query) return true;
    return [g.full_name, g.phone].filter(Boolean).some((v) => v.toLowerCase().includes(query));
  });

  const validProfile = filteredProfiles.length > 0;
  const validGuest = filteredGuests.length > 0;

  const handleTypeChange = (type) => {
    setCustomerType(type);
    if (type === "anonymous") {
      setCustomer(null);
    } else if (type === "guest") {
      setCustomer({ full_name: "", phone: "", address: "" });
    } else {
      // authenticated: se materializa al seleccionar del buscador fusionado
      setCustomer(null);
    }
  };

  const handleSelectProfile = (profile) => {
    setCustomerType("authenticated");
    setCustomer(profile);
    setOpen(false);
  };

  const handleSelectGuest = (guest) => {
    setCustomerType("guest");
    setCustomer(guest);
    setOpen(false);
  };

  const updateGuest = (field, value) => {
    setCustomer({
      ...(customer || { full_name: "", phone: "", address: "" }),
      [field]: value,
    });
  };

  const guestIsNew = customerType === "guest" && !customer?.id;
  const hasGuestIdentity = !!customer?.full_name?.trim() || !!customer?.phone?.trim();

  const selectedLabel =
    customer &&
    (customerType === "guest" ? hasGuestIdentity : customerType === "authenticated")
      ? `${customer.full_name || "Sin nombre"}${customer.phone ? ` - ${customer.phone}` : ""}`
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap" role="group" aria-label="Tipo de cliente">
        <Button
          type="button"
          variant={customerType === "anonymous" ? "default" : "outline"}
          onClick={() => handleTypeChange("anonymous")}
        >
          Sin cliente
        </Button>
        <Button
          type="button"
          variant={customerType === "guest" && customer?.full_name !== "Cliente mostrador" && !customer?.id ? "default" : "outline"}
          onClick={() => handleTypeChange("guest")}
        >
          Invitado
        </Button>
        <Button
          type="button"
          variant={customerType === "authenticated" ? "default" : "outline"}
          onClick={() => handleTypeChange("authenticated")}
        >
          Registrado
        </Button>
      </div>

      {customerType === "anonymous" && (
        <p className="text-sm text-muted-foreground">
          Orden de mostrador — sin datos de cliente registrado.
        </p>
      )}

      {customerType === "guest" && guestIsNew && !hasGuestIdentity && (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Nombre del cliente"
            value={customer?.full_name || ""}
            onChange={(event) => updateGuest("full_name", event.target.value)}
          />
          <Input
            placeholder="Teléfono"
            value={customer?.phone || ""}
            onChange={(event) => updateGuest("phone", event.target.value)}
          />
        </div>
      )}

      {customerType === "guest" && selectedLabel && (
        <div
          className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
          aria-label="Cliente invitado seleccionado"
        >
          <UsersRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{selectedLabel}</span>
          {guestIsNew && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setCustomer({ full_name: "", phone: "", address: "" })}
            >
              Limpiar
            </Button>
          )}
        </div>
      )}

      {/* Buscador unificado: cuentas (profiles) + invitados repetidos (guest_customers) */}
      {customerType === "authenticated" && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-10 w-full justify-start font-normal"
              />
            }
          >
            <CircleUserRound className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedLabel ? (
              <span className="truncate">
                {selectedLabel}
                {customerType === "authenticated" ? "" : " (invitado)"}
              </span>
            ) : (
              <span className="text-muted-foreground">Buscar y seleccionar cliente</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="h-72">
              <div className="p-1">
                {loading ? (
                  <p className="p-3 text-sm text-muted-foreground">Cargando clientes...</p>
                ) : !validProfile && !validGuest ? (
                  <p className="p-3 text-sm text-muted-foreground">Sin resultados</p>
                ) : (
                  <>
                    {validProfile && (
                      <>
                        <p className="px-3 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" /> Con cuenta
                        </p>
                        {filteredProfiles.map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => handleSelectProfile(profile)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                              customerType === "authenticated" && customer?.id === profile.id && "bg-accent"
                            )}
                          >
                            <CircleUserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">
                              {profile.full_name || "Sin nombre"}
                            </span>
                            {profile.phone && (
                              <span className="text-xs text-muted-foreground">{profile.phone}</span>
                            )}
                          </button>
                        ))}
                      </>
                    )}
                    {validGuest && (
                      <>
                        <p className="px-3 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
                          <UsersRound className="h-3.5 w-3.5" /> Invitados previos
                        </p>
                        {filteredGuests.map((guest) => (
                          <button
                            key={guest.id}
                            type="button"
                            onClick={() => handleSelectGuest(guest)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                              customerType === "guest" && customer?.id === guest.id && "bg-accent"
                            )}
                          >
                            <UsersRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">
                              {guest.full_name || "Sin nombre"}
                            </span>
                            {guest.phone && (
                              <span className="text-xs text-muted-foreground">{guest.phone}</span>
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}