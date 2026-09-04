"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  listReservations, createReservation, updateReservation,
  cancelReservation, seatReservation,
  listClientsForReservations, listGuestsForReservations,
  listTablesForReservations, listPackagesForReservations,
  getReservation,
} from "./actions";
import { ReservationForm } from "./components/ReservationForm";
import { ReservationsTableView } from "./components/ReservationsTableView";
import { ReservationsCardsView } from "./components/ReservationsCardsView";
import { ReservationFilters } from "./components/ReservationFilters";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGridIcon, ListIcon, PlusIcon, RefreshCwIcon } from "lucide-react";

export default function ReservationsPage() {
  const { toastSuccess, toastError } = useToast();
  const [reservations, setReservations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReservation, setDeletingReservation] = useState(null);
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  const [seatingReservation, setSeatingReservation] = useState(null);

  const [profiles, setProfiles] = useState([]);
  const [guests, setGuests] = useState([]);
  const [tables, setTables] = useState([]);
  const [packages, setPackages] = useState([]);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const result = await listReservations({ page, pageSize: 20, search, status, date_from: dateFrom, date_to: dateTo });
    if (result.error) { console.error(result.error); setLoading(false); return; }
    setReservations(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, search, status, dateFrom, dateTo]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  useEffect(() => {
    Promise.all([
      listClientsForReservations(),
      listGuestsForReservations(),
      listTablesForReservations(),
      listPackagesForReservations(),
    ]).then(([c, g, t, p]) => {
      if (!c.error) setProfiles(c.data || []);
      if (!g.error) setGuests(g.data || []);
      if (!t.error) setTables(t.data || []);
      if (!p.error) setPackages(p.data || []);
    });
  }, []);

  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleStatusChange = (v) => { setStatus(v); setPage(1); };
  const handleDateFromChange = (v) => { setDateFrom(v); setPage(1); };
  const handleDateToChange = (v) => { setDateTo(v); setPage(1); };

  const handleEdit = async (res) => {
    const result = await getReservation(res.id);
    if (result.error) { toastError(result.error); return; }
    setEditingReservation(result.data);
    setFormOpen(true);
  };

  const handleSeat = (res) => { setSeatingReservation(res); setSeatDialogOpen(true); };

  const handleConfirmSeat = async () => {
    if (!seatingReservation) return;
    setFormLoading(true);
    const result = await seatReservation(seatingReservation.id);
    setFormLoading(false);
    if (result.error) { toastError(result.error); return; }
    toastSuccess(result.success);
    setSeatDialogOpen(false);
    setSeatingReservation(null);
    fetchReservations();
  };

  const handleCancel = (res) => { setDeletingReservation(res); setDeleteDialogOpen(true); };

  const handleConfirmCancel = async () => {
    if (!deletingReservation) return;
    setFormLoading(true);
    const result = await cancelReservation(deletingReservation.id);
    setFormLoading(false);
    if (result.error) { toastError(result.error); return; }
    toastSuccess(result.success);
    setDeleteDialogOpen(false);
    setDeletingReservation(null);
    fetchReservations();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);
    const result = editingReservation
      ? await updateReservation(editingReservation.id, data)
      : await createReservation(data);
    setFormLoading(false);
    if (result.error) { toastError(result.error); return; }
    toastSuccess(result.success);
    setFormOpen(false);
    setEditingReservation(null);
    fetchReservations();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reservaciones</h1>
          <p className="text-muted-foreground">Gestiona las reservaciones del restaurante</p>
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
          <Button variant="outline" size="sm" onClick={fetchReservations}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => { setEditingReservation(null); setFormOpen(true); }}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Reservación
          </Button>
        </div>
      </div>

      <ReservationFilters
        search={search} onSearch={handleSearch}
        status={status} onStatusChange={handleStatusChange}
        dateFrom={dateFrom} onDateFromChange={handleDateFromChange}
        dateTo={dateTo} onDateToChange={handleDateToChange}
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : viewMode === "table" ? (
        <ReservationsTableView
          reservations={reservations} onEdit={handleEdit}
          onSeat={handleSeat} onCancel={handleCancel}
        />
      ) : (
        <ReservationsCardsView
          reservations={reservations} onEdit={handleEdit}
          onSeat={handleSeat} onCancel={handleCancel}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} reservaciones
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
            <h2 className="text-xl font-bold mb-6">
              {editingReservation ? "Editar Reservación" : "Nueva Reservación"}
            </h2>
            <ReservationForm
              initialData={editingReservation}
              onSubmit={handleFormSubmit}
              onCancel={() => { setFormOpen(false); setEditingReservation(null); }}
              isLoading={formLoading}
              profiles={profiles}
              guests={guests}
              tables={tables}
              packages={packages}
            />
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reservación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cancelar esta reservación de{" "}
              <strong>{deletingReservation?.profile?.full_name || deletingReservation?.guest_customer?.full_name || "Cliente"}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} disabled={formLoading}>
              {formLoading ? "Cancelando..." : "Confirmar cancelación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={seatDialogOpen} onOpenChange={setSeatDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sentar reservación</AlertDialogTitle>
            <AlertDialogDescription>
              La mesa pasará a estado <strong>ocupada</strong>. Esta acción confirma la presencia del cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSeat} disabled={formLoading}>
              {formLoading ? "Sentando..." : "Sentar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
