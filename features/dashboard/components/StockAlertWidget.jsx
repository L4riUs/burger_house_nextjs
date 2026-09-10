"use client";

import { AlertTriangleIcon, PackageIcon, ShoppingBagIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";

export function StockAlertWidget({ alerts = [], loading = false }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
            Alertas de Stock Bajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-emerald-600" />
            Alertas de Stock Bajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <PackageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No hay alertas de stock bajo</p>
            <p className="text-xs text-muted-foreground mt-1">Todos los ítems están por encima del mínimo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rawMaterials = alerts.filter((a) => a.item_type === "raw_material");
  const products = alerts.filter((a) => a.item_type === "product");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
          Alertas de Stock Bajo
          <Badge variant="destructive" className="ml-2">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rawMaterials.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                <PackageIcon className="h-4 w-4" />
                Materias Primas ({rawMaterials.length})
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ítem</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Déficit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawMaterials.slice(0, 10).map((alert) => (
                      <TableRow key={alert.item_id}>
                        <TableCell className="font-medium">{alert.item_name}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(alert.current_stock)} {alert.unit_abbreviation}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(alert.min_stock)} {alert.unit_abbreviation}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          -{formatNumber(alert.deficit)} {alert.unit_abbreviation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                <ShoppingBagIcon className="h-4 w-4" />
                Productos Retail ({products.length})
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Déficit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.slice(0, 10).map((alert) => (
                      <TableRow key={alert.item_id}>
                        <TableCell className="font-medium">{alert.item_name}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(alert.current_stock)} {alert.unit_abbreviation}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(alert.min_stock)} {alert.unit_abbreviation}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          -{formatNumber(alert.deficit)} {alert.unit_abbreviation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}