"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  listCombos,
  createCombo,
  updateCombo,
  deleteCombo,
  listProductsForCombos,
  getCombo,
} from "./actions";
import { ComboForm } from "./components/ComboForm";
import { ComboTable } from "./components/ComboTable";
import { ComboCards } from "./components/ComboCards";
import { ComboFilters } from "./components/ComboFilters";
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

export default function CombosPage() {
  const { toastSuccess, toastError } = useToast();
  const [combos, setCombos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCombo, setDeletingCombo] = useState(null);
  const [products, setProducts] = useState([]);

  const fetchCombos = useCallback(async () => {
    setLoading(true);
    const result = await listCombos({
      page,
      pageSize: 10,
      search: search || undefined,
    });

    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }

    setCombos(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchCombos();
  }, [fetchCombos]);

  useEffect(() => {
    const fetchLookups = async () => {
      const prodResult = await listProductsForCombos();
      if (!prodResult.error) setProducts(prodResult.data || []);
    };
    fetchLookups();
  }, []);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleEdit = async (combo) => {
    const result = await getCombo(combo.id);
    if (result.error) {
      toastError(result.error);
      return;
    }
    setEditingCombo(result.data);
    setFormOpen(true);
  };

  const handleDelete = (combo) => {
    setDeletingCombo(combo);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCombo) return;

    setFormLoading(true);
    const result = await deleteCombo(deletingCombo.id);
    setFormLoading(false);

    if (result.error) {
      toastError(result.error);
      return;
    }

    toastSuccess(result.success);
    setDeleteDialogOpen(false);
    setDeletingCombo(null);
    fetchCombos();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);

    let result;
    if (editingCombo) {
      result = await updateCombo(editingCombo.id, data);
    } else {
      result = await createCombo(data);
    }

    setFormLoading(false);

    if (result.error) {
      toastError(result.error);
      return;
    }

    toastSuccess(result.success);
    setFormOpen(false);
    setEditingCombo(null);
    fetchCombos();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingCombo(null);
  };

  const handleRefresh = () => {
    fetchCombos();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Combos</h1>
          <p className="text-muted-foreground">
            Administra los combos y paquetes del catálogo
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
              setEditingCombo(null);
              setFormOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Combo
          </Button>
        </div>
      </div>

      <ComboFilters search={search} onSearch={handleSearch} />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <ComboTable
          combos={combos}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <ComboCards
          combos={combos}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} combos
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
              {editingCombo ? "Editar Combo" : "Nuevo Combo"}
            </h2>
            <ComboForm
              initialData={editingCombo}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isLoading={formLoading}
              products={products}
            />
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar combo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar{" "}
              <strong>{deletingCombo?.name?.es || deletingCombo?.name}</strong>?
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
