"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { EditIcon, TrashIcon } from "lucide-react";

export function SupplierTable({ suppliers, onEdit, onDelete }) {
  if (!suppliers || suppliers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron proveedores
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RIF</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {supplier.tax_id || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {supplier.contact_name || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {supplier.phone || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-xs">
                  {supplier.email || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <TableRowActions
                    items={[
                      { label: "Editar", icon: EditIcon, onClick: () => onEdit(supplier) },
                      { label: "Eliminar", icon: TrashIcon, destructive: true, onClick: () => onDelete(supplier) },
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