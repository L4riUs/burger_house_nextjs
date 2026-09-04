"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PlusIcon, PencilIcon, Trash2Icon, PowerIcon } from "lucide-react";
import { listPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, togglePaymentMethodActive } from "@/features/caja/actions";
import { paymentMethodSchema } from "@/features/caja/schemas";
import { CURRENCY_LABELS } from "@/features/caja/helpers";
import { PaymentMethodFilters } from "@/features/caja/components/PaymentMethodFilters";
import { useToast } from "@/hooks/use-toast";

export default function PaymentMethodsPage() {
  const { toastSuccess, toastError } = useToast();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [filters, setFilters] = useState({ search: "", currency: "all", status: "all" });

  const form = useForm({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: { name: "", currency: "VES", provider_code: "", is_active: true },
  });

  const fetchMethods = async () => {
    setLoading(true);
    const result = await listPaymentMethods();
    setMethods(result.data || []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const result = await listPaymentMethods();
      if (!cancelled) {
        setMethods(result.data || []);
        setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setEditingMethod(null);
    form.reset({ name: "", currency: "VES", provider_code: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (method) => {
    setEditingMethod(method);
    form.reset({
      id: method.id,
      name: method.name,
      currency: method.currency,
      provider_code: method.provider_code || "",
      is_active: method.is_active,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data) => {
    const result = editingMethod
      ? await updatePaymentMethod(data)
      : await createPaymentMethod(data);
    if (result.error) {
      toastError(result.error);
    } else {
      toastSuccess(result.success);
      setDialogOpen(false);
      fetchMethods();
    }
  };

  const handleToggle = async (id) => {
    const result = await togglePaymentMethodActive(id);
    if (result.error) toastError(result.error);
    else {
      toastSuccess(result.success);
      fetchMethods();
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    const result = await deletePaymentMethod(deleteDialog.id);
    if (result.error) toastError(result.error);
    else {
      toastSuccess(result.success);
      setDeleteDialog({ open: false, id: null });
      fetchMethods();
    }
  };

  const filteredMethods = methods.filter((m) => {
    if (filters.search && !m.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.currency !== "all" && m.currency !== filters.currency) return false;
    if (filters.status === "active" && !m.is_active) return false;
    if (filters.status === "inactive" && m.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métodos de Pago</h1>
          <p className="text-muted-foreground">Gestionar métodos de pago aceptados</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Nuevo Método
        </Button>
      </div>

      <PaymentMethodFilters filters={filters} onChange={setFilters} />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMethods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay métodos de pago que coincidan con los filtros
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMethods.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell><Badge variant="outline">{m.currency}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{m.provider_code || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={m.is_active ? "default" : "secondary"}>
                          {m.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <TableRowActions
                          items={[
                            { label: "Editar", icon: PencilIcon, onClick: () => openEdit(m) },
                            {
                              label: m.is_active ? "Desactivar" : "Activar",
                              icon: PowerIcon,
                              onClick: () => handleToggle(m.id),
                            },
                            { label: "Eliminar", icon: Trash2Icon, destructive: true, onClick: () => setDeleteDialog({ open: true, id: m.id }) },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMethod ? "Editar Método" : "Nuevo Método de Pago"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input {...form.register("name")} placeholder="Ej: Pago Móvil" />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Controller
                name="currency"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona la moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CURRENCY_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.currency && <p className="text-sm text-destructive">{form.formState.errors.currency.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Código de Proveedor (opcional)</Label>
              <Input {...form.register("provider_code")} placeholder="pago_movil, binance, zelle..." />
            </div>
            <Button type="submit">
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMethod ? "Guardar Cambios" : "Crear Método"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar método de pago?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción desactivará permanentemente el método de pago.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
