"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangleIcon, PackageIcon, CheckCircleIcon } from "lucide-react";
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

  if (lowStockItems.length === 0) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircleIcon className="h-5 w-5" />
          <span className="font-medium">Sin alertas de stock bajo</span>
        </div>
        <p className="text-sm text-green-600 mt-1">Todos los ítems están por encima del stock mínimo</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showTitle && (
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">
            Alertas de Stock Bajo ({lowStockItems.length})
          </h3>
        </div>
      )}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {lowStockItems.map((material) => {
          const currentStock = material.current_stock || 0;
          const minStock = material.min_stock || 0;
          const percentage = minStock > 0 ? Math.round((currentStock / minStock) * 100) : 0;
          
          return (
            <div key={material.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-yellow-900 truncate">
                    {getLocalizedField(material.category?.name, "es") || material.name}
                  </p>
                  <p className="text-xs text-yellow-700 truncate">
                    {material.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-yellow-700">
                      Stock: <strong>{Number(currentStock).toLocaleString()}</strong> / Mín: <strong>{Number(minStock).toLocaleString()}</strong>
                    </span>
                    <Badge variant="destructive" className="text-xs">
                      {percentage}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {materials.filter(m => (m.current_stock || 0) < (m.min_stock || 0)).length > maxItems && (
        <p className="text-xs text-yellow-600 text-center">
          +{materials.filter(m => (m.current_stock || 0) < (m.min_stock || 0)).length - maxItems} más...
        </p>
      )}
    </div>
  );
}