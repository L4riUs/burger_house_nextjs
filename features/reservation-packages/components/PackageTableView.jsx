"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { EditIcon, TrashIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getLocalizedField } from "@/lib/i18n";

export function PackageTableView({ packages, onEdit, onDelete }) {
  if (!packages || packages.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No se encontraron paquetes</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Capacidad</TableHead>
              <TableHead>Precio USD</TableHead>
              <TableHead>Precio VES</TableHead>
              <TableHead>Mesas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell className="font-medium">
                  <div>
                    <span>{getLocalizedField(pkg.name, "es") || pkg.name}</span>
                    {pkg.description && (getLocalizedField(pkg.description, "es")) && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{getLocalizedField(pkg.description, "es")}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{pkg.capacity} personas</TableCell>
                <TableCell className="font-mono">${Number(pkg.price_usd || 0).toFixed(2)}</TableCell>
                <TableCell className="font-mono">{formatCurrency(pkg.price_ves)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{pkg.package_tables?.length || 0} mesas</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <TableRowActions
                    items={[
                      { label: "Editar", icon: EditIcon, onClick: () => onEdit(pkg) },
                      { label: "Eliminar", icon: TrashIcon, destructive: true, onClick: () => onDelete(pkg) },
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