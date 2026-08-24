"use client";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { EditIcon, TrashIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExtraCards({ extras, products = [], onEdit, onDelete }) {
  if (!extras || extras.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron adicionales
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {extras.map((extra) => (
        <Card key={extra.id}>
          <CardContent className="p-4">
            <h3 className="font-medium">
              {extra.name?.es || extra.name}
            </h3>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="font-mono font-medium">
                USD ${Number(extra.price_usd || 0).toFixed(2)}
              </span>
            </div>
            {extra.raw_material && (
              <p className="text-sm text-muted-foreground mt-2">
                Materia prima: {extra.raw_material.name} ({extra.raw_material_quantity} {extra.raw_material.unit?.abbreviation || "un"})
              </p>
            )}
            <div className="mt-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  nativeButton={false}
                  render={<span className={cn(badgeVariants({ variant: "secondary" }), "cursor-pointer hover:bg-secondary/80 outline-none")} />}
                >
                  {extra.product_ids?.length || 0} producto(s) asociado(s)
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <p className="px-3 py-2 text-xs text-muted-foreground font-medium">Productos Relacionados</p>
                  {(!extra.product_ids || extra.product_ids.length === 0) ? (
                    <div className="p-2 text-sm text-muted-foreground">Ninguno</div>
                  ) : (
                    extra.product_ids.map((id) => {
                      const product = products.find((p) => p.id === id);
                      return (
                        <DropdownMenuItem key={id}>
                          {product ? (product.name?.es || product.name) : "Producto Desconocido"}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(extra)}
            >
              <EditIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(extra)}
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
