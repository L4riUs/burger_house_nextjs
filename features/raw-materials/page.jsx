"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listRawMaterials, createRawMaterial, updateRawMaterial, deleteRawMaterial, listCategoriesForRawMaterials, listUnits, listSuppliers } from "./actions";
import { RawMaterialForm } from "./components/RawMaterialForm";
import { RawMaterialTable } from "./components/RawMaterialTable";
import { RawMaterialCards } from "./components/RawMaterialCards";
import { RawMaterialFilters } from "./components/RawMaterialFilters";
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

export default function RawMaterialsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [materials, setMaterials] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [categoryId, setCategoryId] = useState(searchParams.get("category") || "");
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("low_stock") === "true");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState(null);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    const params = {
      page,
      pageSize: 10,
      categoryId: categoryId || undefined,
      search: search || undefined,
      lowStock: lowStockOnly,
    };

    const result = await listRawMaterials(params);

    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }

    setMaterials(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, categoryId, search, lowStockOnly]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [catResult, unitResult, supResult] = await Promise.all([
        listCategoriesForRawMaterials(),
        listUnits(),
        listSuppliers(),
      ]);
      if (!catResult.error) setCategories(catResult.data || []);
      if (!unitResult.error) setUnits(unitResult.data || []);
      if (!supResult.error) setSuppliers(supResult.data || []);
    };
    fetchLookups();
  }, []);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (value) => {
    setCategoryId(value);
    setPage(1);
  };

  const handleLowStockChange = (value) => {
    setLowStockOnly(value);
    setPage(1);
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormOpen(true);
  };

  const handleDelete = (material) => {
    setDeletingMaterial(material);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMaterial) return;

    setFormLoading(true);
    const result = await deleteRawMaterial(deletingMaterial.id);
    setFormLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setDeleteDialogOpen(false);
    setDeletingMaterial(null);
    fetchMaterials();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);

    let result;
    if (editingMaterial) {
      result = await updateRawMaterial(editingMaterial.id, data);
    } else {
      result = await createRawMaterial(data);
    }

    setFormLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setFormOpen(false);
    setEditingMaterial(null);
    fetchMaterials();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingMaterial(null);
  };

  const handleRefresh = () => {
    fetchMaterials();
  };

  const hasFilters = search || categoryId || lowStockOnly;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Materias Primas</h1>
          <p className="text-muted-foreground">
            Administra las materias primas para recetas e inventario
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => { setEditingMaterial(null); setFormOpen(true); }}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Materia Prima
          </Button>
        </div>
      </div>

      <RawMaterialFilters
        search={search}
        onSearch={handleSearch}
        categoryId={categoryId}
        onCategoryIdChange={handleCategoryChange}
        hasFilters={hasFilters}
        lowStockOnly={lowStockOnly}
        onLowStockOnlyChange={handleLowStockChange}
      />

      {(categoryId || lowStockOnly) && (
        <div className="flex items-center gap-2 flex-wrap">
          {categoryId && (
            <span className="text-sm text-muted-foreground">
              Categoría: {categories.find(c => c.id === categoryId)?.name?.es || categoryId}
            </span>
          )}
          {lowStockOnly && (
            <span className="text-sm text-amber-600 font-medium">Mostrando solo stock bajo</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <RawMaterialTable
          materials={materials}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <RawMaterialCards
          materials={materials}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} materias primas
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
              {editingMaterial ? "Editar Materia Prima" : "Nueva Materia Prima"}
            </h2>
            <RawMaterialForm
              initialData={editingMaterial}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isLoading={formLoading}
              categories={categories}
              units={units}
              suppliers={suppliers}
            />
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar materia prima</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar <strong>{deletingMaterial?.name}</strong>?
              Esta acción la moverá a la papelera.
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