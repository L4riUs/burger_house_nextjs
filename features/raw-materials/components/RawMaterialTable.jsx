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
import { EditIcon, TrashIcon, AlertTriangleIcon } from "lucide-react";

export function RawMaterialTable({ materials, onEdit, onDelete }) {
  if (!materials || materials.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron materias primas
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
              <TableHead>Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Stock Mín</TableHead>
              <TableHead>Costo Prom.</TableHead>
              <TableHead>Stock Actual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => {
              const currentStock = material.current_stock || 0;
              const minStock = material.min_stock || 0;
              const isLowStock = currentStock < minStock;

              return (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {material.category?.name?.es || material.category?.name || "—"}
                  </TableCell>
                  <TableCell className="font-mono">
                    {material.unit?.name} ({material.unit?.abbreviation})
                  </TableCell>
                  <TableCell className="font-mono">{Number(minStock).toLocaleString()}</TableCell>
                  <TableCell className="font-mono">${Number(material.average_cost || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono font-medium">
                    {Number(currentStock).toLocaleString()} {material.unit_abbreviation || material.unit?.abbreviation || ""}
                  </TableCell>
                  <TableCell>
                    {isLowStock && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangleIcon className="h-3 w-3" />
                        Stock Bajo
                      </Badge>
                    )}
                    {!isLowStock && <Badge variant="default">OK</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <TableRowActions
                      items={[
                        { label: "Editar", icon: EditIcon, onClick: () => onEdit(material) },
                        { label: "Eliminar", icon: TrashIcon, destructive: true, onClick: () => onDelete(material) },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}