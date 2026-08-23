"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listCategories, createCategory, updateCategory, deleteCategory } from "./actions";
import { CategoryForm } from "./components/CategoryForm";
import { CategoryTable } from "./components/CategoryTable";
import { CategoryCards } from "./components/CategoryCards";
import { CategoryFilters } from "./components/CategoryFilters";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGridIcon, ListIcon, PlusIcon, SearchIcon } from "lucide-react";
import { getLocalizedField } from "@/lib/i18n";

export default function CategoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [appliesTo, setAppliesTo] = useState(searchParams.get("applies_to") || "all");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState("");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const params = {
      page,
      pageSize: 10,
      appliesTo: appliesTo === "all" ? undefined : appliesTo,
      search: search || undefined,
    };

    const result = await listCategories(params);

    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }

    setCategories(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, appliesTo, search]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleAppliesToChange = (value) => {
    setAppliesTo(value);
    setPage(1);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleDelete = (category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;

    setFormLoading(true);
    const result = await deleteCategory(deletingCategory.id);
    setFormLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setDeleteDialogOpen(false);
    setDeletingCategory(null);
    setDeleteWarning("");
    fetchCategories();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);

    let result;
    if (editingCategory) {
      result = await updateCategory(editingCategory.id, data);
    } else {
      result = await createCategory(data);
    }

    setFormLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setFormOpen(false);
    setEditingCategory(null);
    fetchCategories();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingCategory(null);
  };

  const hasFilters = search || appliesTo !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">
            Administra las categorías de productos y materias primas
          </p>
        </div>
        <Button onClick={() => { setEditingCategory(null); setFormOpen(true); }}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <CategoryFilters
        search={search}
        onSearch={handleSearch}
        appliesTo={appliesTo}
        onAppliesToChange={handleAppliesToChange}
        hasFilters={hasFilters}
      />

      {appliesTo !== "all" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrando por:</span>
          <span className="text-sm font-medium">
            {appliesTo === "product" ? "Productos" : "Materias Primas"}
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <CategoryTable
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <CategoryCards
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} categorías
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
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </h2>
            <CategoryForm
              initialData={editingCategory}
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
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar <strong>{deletingCategory ? getLocalizedField(deletingCategory.name, "es") : ""}</strong>?
              Esta acción la moverá a la papelera.
              {deleteWarning && (
                <p className="mt-2 text-sm text-destructive">{deleteWarning}</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={formLoading}
            >
              {formLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}