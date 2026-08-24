"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { EditIcon, TrashIcon } from "lucide-react";

export function ProductCards({ products, onEdit, onDelete }) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron productos
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id}>
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name?.es || product.name}
              className="w-full h-40 object-cover rounded-t-lg"
            />
          )}
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium line-clamp-1">
                {product.name?.es || product.name}
              </h3>
              <div className="flex gap-1 shrink-0">
                <Badge variant={product.product_type === "prepared" ? "default" : "secondary"}>
                  {product.product_type === "prepared" ? "Preparado" : "Retail"}
                </Badge>
              </div>
            </div>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {product.description?.es || product.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="font-mono font-medium">
                USD ${Number(product.price_usd || 0).toFixed(2)}
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              {!product.is_active && (
                <Badge variant="outline">Inactivo</Badge>
              )}
              {product.is_sold_out && (
                <Badge variant="destructive">Agotado</Badge>
              )}
              {product.is_active && !product.is_sold_out && (
                <Badge variant="default">Activo</Badge>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(product)}
            >
              <EditIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(product)}
              className="text-destructive hover:text-destructive"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
