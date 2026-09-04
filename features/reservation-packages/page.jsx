"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  listPackages, createPackage, updatePackage, deletePackage,
  listTablesForPackages, getPackage,
} from "./actions";
import { PackageForm } from "./components/PackageForm";
import { PackageTableView } from "./components/PackageTableView";
import { PackageCardsView } from "./components/PackageCardsView";
import { PackageFilters } from "./components/PackageFilters";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGridIcon, ListIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { getLocalizedField } from "@/lib/i18n";

export default function ReservationPackagesPage() {
  const { toastSuccess, toastError } = useToast();
  const [packages, setPackages] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState(null);
  const [tables, setTables] = useState([]);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    const result = await listPackages({ page, pageSize: 10, search });
    if (result.error) { console.error(result.error); setLoading(false); return; }
    setPackages(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  useEffect(() => {
    listTablesForPackages().then((r) => { if (!r.error) setTables(r.data || []); });
  }, []);

  const handleSearch = (v) => { setSearch(v); setPage(1); };

  const handleEdit = async (pkg) => {
    const result = await getPackage(pkg.id);
    if (result.error) { toastError(result.error); return; }
    setEditingPackage(result.data);
    setFormOpen(true);
  };

  const handleDelete = (pkg) => { setDeletingPackage(pkg); setDeleteDialogOpen(true); };

  const handleConfirmDelete = async () => {
    if (!deletingPackage) return;
    setFormLoading(true);
    const result = await deletePackage(deletingPackage.id);
    setFormLoading(false);
    if (result.error) { toastError(result.error); return; }
    toastSuccess(result.success);
    setDeleteDialogOpen(false);
    setDeletingPackage(null);
    fetchPackages();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);
    const result = editingPackage
      ? await updatePackage(editingPackage.id, data)
      : await createPackage(data);
    setFormLoading(false);
    if (result.error) { toastError(result.error); return; }
    toastSuccess(result.success);
    setFormOpen(false);
    setEditingPackage(null);
    fetchPackages();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paquetes de Reservación</h1>
          <p className="text-muted-foreground">Gestiona los paquetes de reservación con mesas incluidas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("table")}>
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "cards" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("cards")}>
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPackages}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => { setEditingPackage(null); setFormOpen(true); }}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Paquete
          </Button>
        </div>
      </div>

      <PackageFilters search={search} onSearch={handleSearch} />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : viewMode === "table" ? (
        <PackageTableView packages={packages} onEdit={handleEdit} onDelete={handleDelete} />
      ) : (
        <PackageCardsView packages={packages} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} paquetes
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <span className="text-sm">Página {pagination.page} de {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-6">{editingPackage ? "Editar Paquete" : "Nuevo Paquete"}</h2>
            <PackageForm
              initialData={editingPackage}
              onSubmit={handleFormSubmit}
              onCancel={() => { setFormOpen(false); setEditingPackage(null); }}
              isLoading={formLoading}
              tables={tables}
            />
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar paquete</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar <strong>{deletingPackage ? getLocalizedField(deletingPackage.name, "es") || deletingPackage.name : ""}</strong>?
              Esta acción la moverá a la papelera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={formLoading}>
              {formLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
