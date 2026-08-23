"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditIcon, TrashIcon } from "lucide-react";
import { getLocalizedField } from "@/lib/i18n";

export function CategoryCards({ categories, onEdit, onDelete }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron categorías
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium truncate">
                {getLocalizedField(category.name, "es")}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {getLocalizedField(category.description, "es") || "Sin descripción"}
              </p>
            </div>
            <Badge variant="secondary">
              {category.applies_to === "product" ? "Producto" : "Materia Prima"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Orden: {category.sort_order}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(category)}
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(category)}
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