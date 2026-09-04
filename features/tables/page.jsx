"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  listTables, listAllTablesForMap, createTable, updateTable, deleteTable,
  listDistinctZones, getTable,
} from "./actions";
import { TableForm } from "./components/TableForm";
import { TablesTableView } from "./components/TablesTableView";
import { TablesCardsView } from "./components/TablesCardsView";
import { TablesMapView } from "./components/TablesMapView";
import { TableFilters } from "./components/TableFilters";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGridIcon, ListIcon, PlusIcon, RefreshCwIcon, MapIcon } from "lucide-react";

export default function TablesPage() {
  const { toastSuccess, toastError } = useToast();
  const [tables, setTables] = useState([]);
  const [mapTables, setMapTables] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [zone, setZone] = useState("");
  const [zones, setZones] = useState([]);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTable, setDeletingTable] = useState(null);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    const result = await listTables({ page, pageSize: 20, search, status, zone });
    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }
    setTables(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, search, status, zone]);

  const fetchMapTables = useCallback(async () => {
    const result = await listAllTablesForMap();
    if (!result.error) setMapTables(result.data || []);
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    fetchMapTables();
  }, [fetchMapTables]);

  useEffect(() => {
    listDistinctZones().then((r) => {
      if (!r.error) setZones(r.data || []);
    });
  }, []);

  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v) => { setStatus(v); setPage(1); };
  const handleZoneChange = (v) => { setZone(v); setPage(1); };

  const handleEdit = async (table) => {
    const result = await getTable(table.id);
    if (result.error) { toastError(result.error); return; }
    setEditingTable(result.data);
    setFormOpen(true);
  };

  const handleDelete = (table) => { setDeletingTable(table); setDeleteDialogOpen(true); };

  const handleConfirmDelete = async () => {
    if (!deletingTable) return;
    setFormLoading(true);
    const result = await deleteTable(deletingTable.id);
    setFormLoading(false);
    if (result.error) { toastError(result.error); return; }
    toastSuccess(result.success);
    setDeleteDialogOpen(false);
    setDeletingTable(null);
    fetchTables();
    fetchMapTables();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);
    const result = editingTable
      ? await updateTable(editingTable.id, data)
      : await createTable(data);
    setFormLoading(false);
    if (result.error) { toastError(result.error); return; }
    toastSuccess(result.success);
    setFormOpen(false);
    setEditingTable(null);
    fetchTables();
    fetchMapTables();
  };

  const handleFormCancel = () => { setFormOpen(false); setEditingTable(null); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mesas</h1>
          <p className="text-muted-foreground">Gestiona las mesas del restaurante</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("table")}>
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "cards" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("cards")}>
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "map" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("map")}>
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchTables(); fetchMapTables(); }}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => { setEditingTable(null); setFormOpen(true); }}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Mesa
          </Button>
        </div>
      </div>

      {viewMode !== "map" && (
        <TableFilters
          search={search} onSearch={handleSearch}
          status={status} onStatusChange={handleStatusChange}
          zone={zone} onZoneChange={handleZoneChange}
          zones={zones}
        />
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : viewMode === "map" ? (
        <TablesMapView tables={mapTables} onEditTable={handleEdit} />
      ) : viewMode === "table" ? (
        <TablesTableView tables={tables} onEdit={handleEdit} onDelete={handleDelete} />
      ) : (
        <TablesCardsView tables={tables} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {viewMode !== "map" && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} mesas
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-sm">Página {pagination.page} de {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-6">
              {editingTable ? "Editar Mesa" : "Nueva Mesa"}
            </h2>
            <TableForm
              initialData={editingTable}
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
            <AlertDialogTitle>Eliminar mesa</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar <strong>{deletingTable?.name}</strong>?
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
