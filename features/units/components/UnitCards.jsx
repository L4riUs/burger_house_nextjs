"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditIcon, TrashIcon } from "lucide-react";

const UNIT_TYPE_LABELS = {
  mass: "Masa",
  volume: "Volumen",
  count: "Conteo",
};

export function UnitCards({ units, onEdit, onDelete }) {
  if (!units || units.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron unidades
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {units.map((unit) => (
        <Card key={unit.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium truncate">
                {unit.name} ({unit.abbreviation})
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {UNIT_TYPE_LABELS[unit.unit_type] || unit.unit_type}
              </p>
            </div>
            {unit.is_base_unit && <Badge variant="default">Base</Badge>}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Factor: {Number(unit.conversion_factor).toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(unit)}
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(unit)}
                  className="text-destructive hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}