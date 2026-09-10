"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { getLocalizedField } from "@/lib/i18n";

export function TopProductsTable({ products = [], combos = [], loading = false }) {
  const allItems = [
    ...products.map((p) => ({
      ...p,
      type: "product",
      name: getLocalizedField(p.product_name, "es"),
    })),
    ...combos.map((c) => ({
      ...c,
      type: "combo",
      name: getLocalizedField(c.combo_name, "es"),
    })),
  ].sort((a, b) => Number(b.total_quantity) - Number(a.total_quantity));

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto/Combo</TableHead>
            <TableHead className="text-right">Tipo</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Ingresos VES</TableHead>
            <TableHead className="text-right">Ingresos USD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><div className="h-4 w-32 bg-muted rounded animate-pulse" /></TableCell>
              <TableCell className="text-right"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
              <TableCell className="text-right"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
              <TableCell className="text-right"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
              <TableCell className="text-right"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay datos de ventas en el período seleccionado</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto/Combo</TableHead>
            <TableHead className="text-right">Tipo</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Ingresos VES</TableHead>
            <TableHead className="text-right">Ingresos USD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allItems.slice(0, 15).map((item, index) => (
            <TableRow key={`${item.type}-${item.product_id || item.combo_id}-${index}`}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-right">
                <Badge variant={item.type === "combo" ? "default" : "secondary"}>
                  {item.type === "combo" ? "Combo" : item.product_type === "prepared" ? "Preparado" : "Retail"}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">{formatNumber(item.total_quantity)}</TableCell>
              <TableCell className="text-right font-mono">{formatNumber(item.total_revenue_ves)} VES</TableCell>
              <TableCell className="text-right font-mono">{formatNumber(item.total_revenue_usd)} USD</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}