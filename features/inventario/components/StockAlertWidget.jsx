"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangleIcon, CheckCircleIcon } from "lucide-react";
import { getLocalizedField } from "@/lib/i18n";

export function StockAlertWidget({ materials = [], maxItems = 5, showTitle = true }) {
  const lowStockItems = materials
    .filter(m => {
      const currentStock = m.current_stock || 0;
      const minStock = m.min_stock || 0;
      return currentStock < minStock;
    })
    .sort((a, b) => {
      const aRatio = (a.current_stock || 0) / (a.min_stock || 1);
      const bRatio = (b.current_stock || 0) / (b.min_stock || 1);
      return aRatio - bRatio;
    })
    .slice(0, maxItems);

  const totalLow = materials.filter(m => (m.current_stock || 0) < (m.min_stock || 0)).length;

  if (totalLow === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
        <CheckCircleIcon className="h-5 w-5 text-green-700" />
        <span className="font-medium text-green-700">Sin alertas de stock bajo</span>
        <span className="text-sm text-green-600">Todos los ítems están por encima del stock mínimo</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-4">
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">
            Alertas de Stock Bajo ({totalLow})
          </h3>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {lowStockItems.map((material) => {
          const currentStock = material.current_stock || 0;
          const minStock = material.min_stock || 0;
          const percentage = minStock > 0 ? Math.round((currentStock / minStock) * 100) : 0;

          return (
            <div key={material.id} className="rounded-lg border border-yellow-200 bg-white p-3 dark:bg-background">
              <p className="font-medium text-yellow-900 truncate">
                {getLocalizedField(material.category?.name, "es") || material.name}
              </p>
              <p className="text-xs text-yellow-700 truncate">{material.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-yellow-700">
                  Stock: <strong>{Number(currentStock).toLocaleString()}</strong> / Mín: <strong>{Number(minStock).toLocaleString()}</strong>
                </span>
                <Badge variant="destructive" className="text-xs">
                  {percentage}%
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
      {totalLow > maxItems && (
        <p className="text-xs text-yellow-600 text-center mt-3">
          +{totalLow - maxItems} más...
        </p>
      )}
    </div>
  );
}