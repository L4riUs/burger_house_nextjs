"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supplierFormSchema } from "../schemas";

export function SupplierForm({ initialData, onSubmit, onCancel, isLoading }) {
  const methods = useForm({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      tax_id: "",
      contact_name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      ...initialData,
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, reset } = methods;

  useEffect(() => {
    if (initialData) {
      methods.reset({
        name: initialData.name || "",
        tax_id: initialData.tax_id || "",
        contact_name: initialData.contact_name || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
        notes: initialData.notes || "",
      });
    }
  }, [initialData, methods]);

  const handleSubmitForm = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Ej: Distribuidora Alimentos SA"
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Label htmlFor="tax_id">RIF / Identificación Fiscal</Label>
          <Input
            id="tax_id"
            {...register("tax_id")}
            placeholder="Ej: J-12345678-9"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="contact_name">Contacto</Label>
          <Input
            id="contact_name"
            {...register("contact_name")}
            placeholder="Nombre del contacto"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            {...register("phone")}
            placeholder="Ej: +58 212-555-1234"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="proveedor@ejemplo.com"
            disabled={isLoading}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label htmlFor="address">Dirección</Label>
        <Textarea
          id="address"
          {...register("address")}
          placeholder="Dirección completa del proveedor"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-4">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="Notas adicionales, condiciones de pago, etc."
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : initialData ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}