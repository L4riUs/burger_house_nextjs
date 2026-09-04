"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { EditIcon, XIcon, CheckIcon } from "lucide-react";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_VARIANT } from "../schemas";
import { canSeatReservation, canCancelReservation, getCustomerName } from "../helpers";
import { getLocalizedField } from "@/lib/i18n";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ReservationsTableView({ reservations, onEdit, onSeat, onCancel }) {
  if (!reservations || reservations.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No se encontraron reservaciones</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha/Hora</TableHead>
              <TableHead>Personas</TableHead>
              <TableHead>Mesa/Paquete</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((res) => (
              <TableRow key={res.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{getCustomerName(res)}</span>
                    {res.profile?.phone && <p className="text-xs text-muted-foreground">{res.profile.phone}</p>}
                    {res.guest_customer?.phone && <p className="text-xs text-muted-foreground">{res.guest_customer.phone}</p>}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{formatDate(res.reserved_at)}</TableCell>
                <TableCell>{res.party_size}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {res.table?.name && <div>{res.table.name}</div>}
                    {res.package?.name && <div className="text-muted-foreground">{getLocalizedField(res.package.name, "es") || res.package.name}</div>}
                    {!res.table?.name && !res.package?.name && <span className="text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={RESERVATION_STATUS_VARIANT[res.status]}>
                    {RESERVATION_STATUS_LABELS[res.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <TableRowActions
                    items={[
                      canSeatReservation(res) && { label: "Sentar", icon: CheckIcon, onClick: () => onSeat(res) },
                      canCancelReservation(res) && { label: "Cancelar", icon: XIcon, destructive: true, onClick: () => onCancel(res) },
                      { label: "Editar", icon: EditIcon, onClick: () => onEdit(res) },
                    ].filter(Boolean)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
