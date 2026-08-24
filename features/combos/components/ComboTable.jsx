"use client";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditIcon, TrashIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ComboTable({ combos, onEdit, onDelete }) {
  if (!combos || combos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron combos
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Precio USD</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {combos.map((combo) => (
            <TableRow key={combo.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {combo.image_url && (
                    <img
                      src={combo.image_url}
                      alt=""
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  <span>{combo.name?.es || combo.name}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono">
                ${Number(combo.price_usd || 0).toFixed(2)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    nativeButton={false}
                    render={<span className={cn(badgeVariants({ variant: "secondary" }), "cursor-pointer hover:bg-secondary/80 outline-none")} />}
                  >
                    Ver detalles
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
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
              </TableCell>
              <TableCell>
                <Badge variant={combo.is_active ? "default" : "outline"}>
                  {combo.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
