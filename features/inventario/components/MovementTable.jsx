"use client";

import { useMemo } from "react";
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

    const movementsByItem = new Map();
    movements.forEach((movement) => {
      const itemKey = `${movement.item_type}:${movement.raw_material_id || movement.product_id}`;
      const itemMovements = movementsByItem.get(itemKey) || [];
      itemMovements.push(movement);
      movementsByItem.set(itemKey, itemMovements);
    });

    const stockByMovementId = new Map();
    movementsByItem.forEach((itemMovements) => {
      let runningStock = 0;
      [...itemMovements].reverse().forEach((movement) => {
        const sign = getMovementSign(movement.movement_type);
        runningStock += Number(movement.quantity) * sign;
        stockByMovementId.set(movement.id, runningStock);
      });
    });

    return movements.map((movement) => ({
      ...movement,
      sign: getMovementSign(movement.movement_type),
      quantity: Number(movement.quantity),
      runningStock: stockByMovementId.get(movement.id) || 0,
    }));
  }, [movements]);

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron movimientos
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Ítem</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Unidad</TableHead>
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
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {movement.quantity.toLocaleString()}
                {movement.unit_id && movement.raw_material?.unit_id !== movement.unit_id && movement.raw_material?.unit && movement.unit && (
                  <span className="text-muted-foreground ml-1 text-xs block">
                    ≈ {Number(movement.quantity) * Number(movement.unit?.conversion_factor || 1) / Number(movement.raw_material?.unit?.conversion_factor || 1)} {movement.raw_material.unit.abbreviation}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {movement.raw_material?.unit?.abbreviation || movement.unit?.abbreviation || "—"}
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                {movement.runningStock.toLocaleString()} {movement.raw_material?.unit_abbreviation || movement.raw_material?.unit?.abbreviation || ""}
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
      </CardContent>
    </Card>
  );
}