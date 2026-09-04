"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditIcon, TrashIcon, UsersIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getLocalizedField } from "@/lib/i18n";

export function PackageCardsView({ packages, onEdit, onDelete }) {
  if (!packages || packages.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No se encontraron paquetes</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {packages.map((pkg) => (
        <Card key={pkg.id} className="relative overflow-hidden">
          <CardContent className="p-4 flex flex-col gap-2">
            <span className="font-semibold">{getLocalizedField(pkg.name, "es") || pkg.name}</span>
            {pkg.description && getLocalizedField(pkg.description, "es") && (
              <span className="text-xs text-muted-foreground line-clamp-2">{getLocalizedField(pkg.description, "es")}</span>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" />
              <span>{pkg.capacity} personas</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{pkg.package_tables?.length || 0} mesas</Badge>
            </div>
            <span className="font-semibold text-primary">{formatCurrency(pkg.price_ves)}</span>
            <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => onEdit(pkg)}>
                <EditIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(pkg)} className="text-destructive hover:text-destructive">
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}