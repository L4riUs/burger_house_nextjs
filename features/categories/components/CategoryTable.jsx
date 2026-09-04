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
import { getLocalizedField } from "@/lib/i18n";

export function CategoryTable({ categories, onEdit, onDelete }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron categorías
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
              <TableHead>Descripción</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">
                  {getLocalizedField(category.name, "es")}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {getLocalizedField(category.description, "es") || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {category.applies_to === "product" ? "Producto" : "Materia Prima"}
                  </Badge>
                </TableCell>
                <TableCell>{category.sort_order}</TableCell>
                <TableCell className="text-right">
                  <TableRowActions
                    items={[
                      { label: "Editar", icon: EditIcon, onClick: () => onEdit(category) },
                      { label: "Eliminar", icon: TrashIcon, destructive: true, onClick: () => onDelete(category) },
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