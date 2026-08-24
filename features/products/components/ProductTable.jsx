"use client";

import { Badge } from "@/components/ui/badge";
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

export function ProductTable({ products, onEdit, onDelete }) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron productos
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Precio USD</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt=""
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  <span>{product.name?.es || product.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={product.product_type === "prepared" ? "default" : "secondary"}>
                  {product.product_type === "prepared" ? "Preparado" : "Retail"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {product.category?.name?.es || product.category?.name || "—"}
              </TableCell>
              <TableCell className="font-mono">
                ${Number(product.price_usd || 0).toFixed(2)}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
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
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
