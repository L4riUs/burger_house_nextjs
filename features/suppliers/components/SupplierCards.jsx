"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditIcon, TrashIcon } from "lucide-react";

export function SupplierCards({ suppliers, onEdit, onDelete }) {
  if (!suppliers || suppliers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron proveedores
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {suppliers.map((supplier) => (
        <Card key={supplier.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium truncate">
                {supplier.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {supplier.contact_name || "Sin contacto"}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {supplier.tax_id && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">RIF:</span>
                <span className="font-mono text-sm">{supplier.tax_id}</span>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tel:</span>
                <span className="font-mono text-sm">{supplier.phone}</span>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span className="truncate max-w-[150px]">{supplier.email}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(supplier)}
              >
                <EditIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(supplier)}
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