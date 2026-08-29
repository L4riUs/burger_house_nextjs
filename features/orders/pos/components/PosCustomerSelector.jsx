"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePosStore } from "../store";

export function PosCustomerSelector() {
  const customerType = usePosStore((state) => state.customerType);
  const customer = usePosStore((state) => state.customer);
  const setCustomerType = usePosStore((state) => state.setCustomerType);
  const setCustomer = usePosStore((state) => state.setCustomer);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfiles() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .order("full_name");

      if (active) {
        setProfiles(data || []);
        setLoading(false);
      }
    }

    loadProfiles();
    return () => {
      active = false;
    };
  }, []);

  const filteredProfiles = profiles.filter((profile) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [profile.full_name, profile.phone]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const handleTypeChange = (type) => {
    setCustomerType(type);
    setCustomer(type === "guest" ? { full_name: "", phone: "", address: "" } : null);
  };

  const updateGuest = (field, value) => {
    setCustomer({
      ...(customer || { full_name: "", phone: "", address: "" }),
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="Tipo de cliente">
        <Button
          type="button"
          variant={customerType === "guest" ? "default" : "outline"}
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

      {customerType === "guest" ? (
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
      ) : (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Buscar cliente registrado"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={customer?.id || ""}
            onChange={(event) => {
              const profile = profiles.find((item) => item.id === event.target.value);
              setCustomer(profile || null);
            }}
            disabled={loading}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">
              {loading ? "Cargando clientes..." : "Selecciona un cliente"}
            </option>
            {filteredProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name || "Sin nombre"}{profile.phone ? ` - ${profile.phone}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
