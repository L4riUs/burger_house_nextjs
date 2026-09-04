"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditIcon, XIcon, CheckIcon, UsersIcon, ClockIcon } from "lucide-react";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_VARIANT } from "../schemas";
import { canSeatReservation, canCancelReservation, getCustomerName } from "../helpers";
import { getLocalizedField } from "@/lib/i18n";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ReservationsCardsView({ reservations, onEdit, onSeat, onCancel }) {
  if (!reservations || reservations.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No se encontraron reservaciones</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {reservations.map((res) => (
        <Card key={res.id} className="relative overflow-hidden">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold truncate">{getCustomerName(res)}</span>
              <Badge variant={RESERVATION_STATUS_VARIANT[res.status]}>
                {RESERVATION_STATUS_LABELS[res.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon className="h-3.5 w-3.5" />
              <span>{formatDate(res.reserved_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" />
              <span>{res.party_size} personas</span>
            </div>
            {(res.table?.name || res.package?.name) && (
              <div className="text-sm">
                {res.table?.name && <span>{res.table.name}</span>}
                {res.table?.name && res.package?.name && <span> / </span>}
                {res.package?.name && <span className="text-muted-foreground">{getLocalizedField(res.package.name, "es") || res.package.name}</span>}
              </div>
            )}
            {res.notes && <p className="text-xs text-muted-foreground truncate">{res.notes}</p>}
            <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
              {canSeatReservation(res) && (
                <Button variant="ghost" size="sm" onClick={() => onSeat(res)} title="Sentar">
                  <CheckIcon className="h-4 w-4 text-green-600" />
                </Button>
              )}
              {canCancelReservation(res) && (
                <Button variant="ghost" size="sm" onClick={() => onCancel(res)} title="Cancelar" className="text-destructive hover:text-destructive">
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onEdit(res)}>
                <EditIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
