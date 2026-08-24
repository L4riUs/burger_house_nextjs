"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  listProductExtras,
  createProductExtra,
  updateProductExtra,
  deleteProductExtra,
  listProductsForExtras,
  listRawMaterialsForExtras,
} from "./actions";
import { ExtraForm } from "./components/ExtraForm";
import { ExtraTable } from "./components/ExtraTable";
import { ExtraCards } from "./components/ExtraCards";
import { ExtraFilters } from "./components/ExtraFilters";
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
import { LayoutGridIcon, ListIcon, PlusIcon, RefreshCwIcon } from "lucide-react";

export default function ProductExtrasPage() {
  const { toastSuccess, toastError } = useToast();
  const [extras, setExtras] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExtra, setDeletingExtra] = useState(null);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  const fetchExtras = useCallback(async () => {
    setLoading(true);
    const result = await listProductExtras({
      page,
      pageSize: 10,
      search: search || undefined,
    });

    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }

    setExtras(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchExtras();
  }, [fetchExtras]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [prodResult, rmResult] = await Promise.all([
        listProductsForExtras(),
        listRawMaterialsForExtras(),
      ]);
      if (!prodResult.error) setProducts(prodResult.data || []);
      if (!rmResult.error) setRawMaterials(rmResult.data || []);
    };
    fetchLookups();
  }, []);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleEdit = (extra) => {
    setEditingExtra(extra);
    setFormOpen(true);
  };

  const handleDelete = (extra) => {
    setDeletingExtra(extra);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExtra) return;

    setFormLoading(true);
    const result = await deleteProductExtra(deletingExtra.id);
    setFormLoading(false);

    if (result.error) {
      toastError(result.error);
      return;
    }

    toastSuccess(result.success);
    setDeleteDialogOpen(false);
    setDeletingExtra(null);
    fetchExtras();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);

    let result;
    if (editingExtra) {
      result = await updateProductExtra(editingExtra.id, data);
    } else {
      result = await createProductExtra(data);
    }

    setFormLoading(false);

    if (result.error) {
      toastError(result.error);
      return;
    }

    toastSuccess(result.success);
    setFormOpen(false);
    setEditingExtra(null);
    fetchExtras();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingExtra(null);
  };

  const handleRefresh = () => {
    fetchExtras();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Adicionales</h1>
          <p className="text-muted-foreground">
            Administra los adicionales/modificadores del catálogo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button
            onClick={() => {
              setEditingExtra(null);
              setFormOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Adicional
          </Button>
        </div>
      </div>

      <ExtraFilters search={search} onSearch={handleSearch} />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <ExtraTable
          extras={extras}
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <ExtraCards
          extras={extras}
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} adicionales
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
          <div className="bg-background w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-6">
              {editingExtra ? "Editar Adicional" : "Nuevo Adicional"}
            </h2>
            <ExtraForm
              initialData={editingExtra}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isLoading={formLoading}
              products={products}
              rawMaterials={rawMaterials}
            />
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar adicional</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar{" "}
              <strong>{deletingExtra?.name?.es || deletingExtra?.name}</strong>?
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
