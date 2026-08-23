"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMovementSign, getMovementTypeLabel, getMovementTypeVariant } from "../lib/movement-utils";

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  // Use fixed format to avoid hydration mismatch between server/client
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function MovementTable({ movements, onViewDetails }) {
  const movementsWithStock = useMemo(() => {
    if (!movements || movements.length === 0) return [];
    let runningStock = 0;
    return movements.map((movement) => {
      const sign = getMovementSign(movement.movement_type);
      const quantity = Number(movement.quantity);
      const signedQty = quantity * sign;
      runningStock += signedQty;
      return { ...movement, sign, quantity, runningStock };
    });
  }, [movements]);

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron movimientos
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Ítem</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Stock Resultante</TableHead>
            <TableHead>Costo Unit.</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Registrado por</TableHead>
            <TableHead>Nota</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movementsWithStock.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {formatDate(movement.created_at)}
              </TableCell>
              <TableCell>
                <Badge variant={getMovementTypeVariant(movement.movement_type)}>
                  {getMovementTypeLabel(movement.movement_type)}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {movement.raw_material?.name || movement.product?.name || "—"}
                {movement.raw_material?.unit && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({movement.raw_material.unit.abbreviation})
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                <span className={movement.sign > 0 ? "text-green-600" : "text-red-600"}>
                  {movement.sign > 0 ? "+" : ""}{movement.quantity.toLocaleString()}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                {movement.runningStock.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {movement.unit_cost ? `${Number(movement.unit_cost).toFixed(2)}` : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {movement.supplier?.name || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {movement.performed_by_profile?.full_name || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-xs truncate">
                {movement.note || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}