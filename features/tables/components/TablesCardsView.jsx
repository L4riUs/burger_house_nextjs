"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditIcon, TrashIcon, UsersIcon, CrownIcon } from "lucide-react";
import { TABLE_STATUS_LABELS, TABLE_STATUS_COLORS } from "../schemas";

export function TablesCardsView({ tables, onEdit, onDelete }) {
  if (!tables || tables.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No se encontraron mesas</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {tables.map((table) => (
        <Card key={table.id} className="relative overflow-hidden">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{table.name}</span>
              {table.is_vip && <CrownIcon className="h-4 w-4 text-yellow-500" />}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" />
              <span>{table.capacity} personas</span>
            </div>
            {table.zone && <span className="text-xs text-muted-foreground">{table.zone}</span>}
            <Badge
              className={`text-xs w-fit mt-1 border ${TABLE_STATUS_COLORS[table.status] || ""}`}
            >
              {TABLE_STATUS_LABELS[table.status] || table.status}
            </Badge>
            <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => onEdit(table)}>
                <EditIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="sm" onClick={() => onDelete(table)}
                className="text-destructive hover:text-destructive"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
