"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrownIcon, UsersIcon } from "lucide-react";
import { TABLE_STATUS_LABELS, TABLE_STATUS_COLORS } from "../schemas";

const STATUS_MAP_BOX = {
  available: "bg-green-200 border-green-400 hover:bg-green-300",
  occupied: "bg-red-200 border-red-400",
  reserved: "bg-yellow-200 border-yellow-400",
  out_of_service: "bg-gray-200 border-gray-300 opacity-60",
};

export function TablesMapView({ tables, onEditTable }) {
  if (!tables || tables.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No hay mesas para mostrar</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map((table) => (
          <button
            key={table.id}
            type="button"
            onClick={() => onEditTable(table)}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-4 text-center transition-colors cursor-pointer ${STATUS_MAP_BOX[table.status] || "bg-gray-100"}`}
          >
            {table.is_vip && <CrownIcon className="absolute top-1 right-1 h-3.5 w-3.5 text-yellow-600" />}
            <span className="font-semibold text-sm">{table.name}</span>
            <div className="flex items-center gap-1 text-xs">
              <UsersIcon className="h-3 w-3" />
              <span>{table.capacity}</span>
            </div>
            {table.zone && <span className="text-[10px] text-muted-foreground">{table.zone}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        {Object.entries(TABLE_STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2 text-xs">
            <span className={`block h-3 w-3 rounded ${STATUS_MAP_BOX[status]?.split(" ")[0] || "bg-gray-200"}`} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
