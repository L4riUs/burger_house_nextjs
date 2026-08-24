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

export function ComboCards({ combos, onEdit, onDelete }) {
  if (!combos || combos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron combos
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {combos.map((combo) => (
        <Card key={combo.id}>
          {combo.image_url && (
            <img
              src={combo.image_url}
              alt={combo.name?.es || combo.name}
              className="w-full h-40 object-cover rounded-t-lg"
            />
          )}
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium line-clamp-1">
                {combo.name?.es || combo.name}
              </h3>
              <Badge variant={combo.is_active ? "default" : "outline"}>
                {combo.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            {combo.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {combo.description?.es || combo.description}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-mono font-medium">
                USD ${Number(combo.price_usd || 0).toFixed(2)}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  nativeButton={false}
                  render={<span className={cn(badgeVariants({ variant: "secondary" }), "cursor-pointer hover:bg-secondary/80 outline-none")} />}
                >
                  Ver detalles
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <p className="px-3 py-2 text-xs text-muted-foreground font-medium">Productos del Combo</p>
                  {(!combo.combo_items || combo.combo_items.length === 0) ? (
                    <div className="p-2 text-sm text-muted-foreground">Ninguno</div>
                  ) : (
                    combo.combo_items.map((item) => (
                      <DropdownMenuItem key={item.id}>
                        {item.quantity}x {item.product?.name?.es || item.product?.name || "Desconocido"}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(combo)}
            >
              <EditIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(combo)}
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
