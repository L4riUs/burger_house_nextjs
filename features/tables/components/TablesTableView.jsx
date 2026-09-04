"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { EditIcon, TrashIcon } from "lucide-react";
import { TABLE_STATUS_LABELS } from "../schemas";

const STATUS_VARIANT = {
  available: "default",
  occupied: "destructive",
  reserved: "secondary",
  out_of_service: "outline",
};

export function TablesTableView({ tables, onEdit, onDelete }) {
  if (!tables || tables.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No se encontraron mesas</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Capacidad</TableHead>
              <TableHead>Zona</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>VIP</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.map((table) => (
              <TableRow key={table.id}>
                <TableCell className="font-medium">{table.name}</TableCell>
                <TableCell>{table.capacity} personas</TableCell>
                <TableCell className="text-muted-foreground">{table.zone || "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[table.status] || "outline"}>
                    {TABLE_STATUS_LABELS[table.status] || table.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {table.is_vip && <Badge variant="secondary">VIP</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <TableRowActions
                    items={[
                      { label: "Editar", icon: EditIcon, onClick: () => onEdit(table) },
                      { label: "Eliminar", icon: TrashIcon, destructive: true, onClick: () => onDelete(table) },
                    ]}
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
