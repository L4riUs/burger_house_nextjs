"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listUnits, createUnit, updateUnit, deleteUnit, checkUnitUsage } from "./actions";
import { UnitForm } from "./components/UnitForm";
import { UnitTable } from "./components/UnitTable";
import { UnitCards } from "./components/UnitCards";
import { UnitFilters } from "./components/UnitFilters";
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

export default function UnitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [units, setUnits] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [unitType, setUnitType] = useState(searchParams.get("unit_type") || "all");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState("");
  const [softDelete, setSoftDelete] = useState(false);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    const params = {
      page,
      pageSize: 10,
      unitType: unitType === "all" ? undefined : unitType,
      search: search || undefined,
    };

    const result = await listUnits(params);

    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }

    setUnits(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, unitType, search]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleUnitTypeChange = (value) => {
    setUnitType(value);
    setPage(1);
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setFormOpen(true);
  };

  const handleDelete = async (unit) => {
    setDeletingUnit(unit);
    setDeleteWarning("");
    setSoftDelete(false);

    const result = await checkUnitUsage(unit.id);
    if (result.error) {
      console.error(result.error);
    } else if (result.count > 0) {
      setDeleteWarning(
        `Esta unidad está siendo usada por ${result.count} materia(s) prima(s). Se realizará un soft-delete (mover a papelera) en lugar de eliminarla permanentemente.`
      );
      setSoftDelete(true);
    }

    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUnit) return;

    setFormLoading(true);
    const result = await deleteUnit(deletingUnit.id);
    setFormLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setDeleteDialogOpen(false);
    setDeletingUnit(null);
    setDeleteWarning("");
    setSoftDelete(false);
    fetchUnits();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);

    let result;
    if (editingUnit) {
      result = await updateUnit(editingUnit.id, data);
    } else {
      result = await createUnit(data);
    }

    setFormLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setFormOpen(false);
    setEditingUnit(null);
    fetchUnits();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingUnit(null);
  };

  const hasFilters = search || unitType !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unidades de Medida</h1>
          <p className="text-muted-foreground">
            Administra las unidades de medida para materias primas y recetas
          </p>
        </div>
        <Button onClick={() => { setEditingUnit(null); setFormOpen(true); }}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Nueva Unidad
        </Button>
      </div>

      <UnitFilters
        search={search}
        onSearch={handleSearch}
        unitType={unitType}
        onUnitTypeChange={handleUnitTypeChange}
        hasFilters={hasFilters}
      />

      {unitType !== "all" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrando por:</span>
          <span className="text-sm font-medium capitalize">{unitType}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <UnitTable
          units={units}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <UnitCards
          units={units}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} unidades
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
              {editingUnit ? "Editar Unidad" : "Nueva Unidad"}
            </h2>
            <UnitForm
              initialData={editingUnit}
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
              Eliminar unidad
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar <strong>{deletingUnit?.name}</strong>?
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