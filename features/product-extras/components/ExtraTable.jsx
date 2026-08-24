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
import { EditIcon, TrashIcon, LinkIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExtraTable({ extras, products = [], onEdit, onDelete }) {
  if (!extras || extras.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron adicionales
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
            <TableHead>Materia Prima</TableHead>
            <TableHead>Cant.</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {extras.map((extra) => (
            <TableRow key={extra.id}>
              <TableCell className="font-medium">
                {extra.name?.es || extra.name}
              </TableCell>
              <TableCell className="font-mono">
                ${Number(extra.price_usd || 0).toFixed(2)}
              </TableCell>
              <TableCell>
                {extra.raw_material ? (
                  <span className="text-sm">
                    {extra.raw_material.name} ({extra.raw_material.unit?.abbreviation || "un"})
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="font-mono">
                {extra.raw_material_quantity || "—"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    nativeButton={false}
                    render={<span className={cn(badgeVariants({ variant: "secondary" }), "cursor-pointer hover:bg-secondary/80 outline-none")} />}
                  >
                    {extra.product_ids?.length || 0}
                    <LinkIcon className="h-3 w-3 ml-1" />
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
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
