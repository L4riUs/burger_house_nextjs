"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "./actions";
import { SupplierForm } from "./components/SupplierForm";
import { SupplierTable } from "./components/SupplierTable";
import { SupplierCards } from "./components/SupplierCards";
import { SupplierFilters } from "./components/SupplierFilters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGridIcon, ListIcon, PlusIcon, AlertTriangleIcon } from "lucide-react";

export default function SuppliersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState("");
  const [softDelete, setSoftDelete] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const params = {
      page,
      pageSize: 10,
      search: search || undefined,
    };

    const result = await listSuppliers(params);

    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }

    setSuppliers(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const handleDelete = async (supplier) => {
    setDeletingSupplier(supplier);
    setDeleteWarning("");
    setSoftDelete(false);

    const result = await fetch(`/api/suppliers/check-usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: supplier.id }),
    });

    const data = await result.json();
    if (data.error) {
      console.error(data.error);
    } else if (data.count > 0) {
      setDeleteWarning(
        `Este proveedor está asignado a ${data.count} materia(s) prima(s) como proveedor principal. Se realizará un soft-delete (mover a papelera) en lugar de eliminarlo permanentemente.`
      );
      setSoftDelete(true);
    }

    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSupplier) return;

    setFormLoading(true);
    const result = await deleteSupplier(deletingSupplier.id);
    setFormLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setDeleteDialogOpen(false);
    setDeletingSupplier(null);
    setDeleteWarning("");
    setSoftDelete(false);
    fetchSuppliers();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);

    let result;
    if (editingSupplier) {
      result = await updateSupplier(editingSupplier.id, data);
    } else {
      result = await createSupplier(data);
    }

    setFormLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setFormOpen(false);
    setEditingSupplier(null);
    fetchSuppliers();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingSupplier(null);
  };

  const hasFilters = search;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">
            Administra los proveedores de materias primas
          </p>
        </div>
        <Button onClick={() => { setEditingSupplier(null); setFormOpen(true); }}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      <SupplierFilters
        search={search}
        onSearch={handleSearch}
        hasFilters={hasFilters}
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <SupplierTable
          suppliers={suppliers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <SupplierCards
          suppliers={suppliers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} proveedores
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-6">
              {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h2>
            <SupplierForm
              initialData={editingSupplier}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isLoading={formLoading}
            />
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {softDelete && <AlertTriangleIcon className="h-5 w-5 mr-2 text-warning" />}
              Eliminar proveedor
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar <strong>{deletingSupplier?.name}</strong>?
              {deleteWarning && (
                <p className="mt-2 text-sm text-destructive">{deleteWarning}</p>
              )}
              {!deleteWarning && (
                <p className="mt-2 text-sm">Esta acción no se puede deshacer.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={formLoading}
              variant={softDelete ? "default" : "destructive"}
            >
              {formLoading ? "Eliminando..." : softDelete ? "Mover a papelera" : "Eliminar permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}