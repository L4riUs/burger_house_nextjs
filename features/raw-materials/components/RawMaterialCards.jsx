"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditIcon, TrashIcon, AlertTriangleIcon } from "lucide-react";

export function RawMaterialCards({ materials, onEdit, onDelete }) {
  if (!materials || materials.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron materias primas
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {materials.map((material) => {
        const currentStock = material.current_stock || 0;
        const minStock = material.min_stock || 0;
        const isLowStock = currentStock < minStock;

        return (
          <Card key={material.id} className={isLowStock ? "border-amber-300 bg-amber-50" : ""}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">
                  {material.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate">
                  {material.category?.name?.es || material.category?.name || "Sin categoría"}
                </p>
              </div>
              {isLowStock && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangleIcon className="h-3 w-3" />
                  Stock Bajo
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unidad:</span>
                <span className="font-mono font-medium">
                  {material.unit?.name} ({material.unit?.abbreviation})
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stock Mín:</span>
                <span className="font-mono">{Number(minStock).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Costo Prom:</span>
                <span className="font-mono">${Number(material.average_cost || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stock Actual:</span>
                <span className="font-mono font-medium text-lg">
                  {Number(currentStock).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(material)}
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(material)}
                  className="text-destructive hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}