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

const UNIT_TYPE_LABELS = {
  mass: "Masa",
  volume: "Volumen",
  count: "Conteo",
};

export function UnitTable({ units, onEdit, onDelete }) {
  if (!units || units.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron unidades
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
              <TableHead>Abreviatura</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Factor Conversión</TableHead>
              <TableHead>Base</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{unit.name}</TableCell>
                <TableCell className="font-mono">{unit.abbreviation}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{UNIT_TYPE_LABELS[unit.unit_type] || unit.unit_type}</Badge>
                </TableCell>
                <TableCell className="font-mono">{Number(unit.conversion_factor).toLocaleString()}</TableCell>
                <TableCell>
                  {unit.is_base_unit && <Badge variant="default">Base</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <TableRowActions
                    items={[
                      { label: "Editar", icon: EditIcon, onClick: () => onEdit(unit) },
                      { label: "Eliminar", icon: TrashIcon, destructive: true, onClick: () => onDelete(unit) },
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