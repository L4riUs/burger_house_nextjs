"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RotateCcwIcon } from "lucide-react";

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrashTable({ trashData, onRestore }) {
  return (
    <div className="space-y-6">
      {trashData.map((entityGroup) => {
        if (entityGroup.data.length === 0) return null;

        return (
          <div key={entityGroup.entity} className="space-y-2">
            <h3 className="text-lg font-semibold text-muted-foreground">
              {entityGroup.label} ({entityGroup.data.length})
            </h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fecha de eliminación</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entityGroup.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.displayName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.deleted_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRestore(entityGroup.entity, item.id)}
                        >
                          <RotateCcwIcon className="h-4 w-4 mr-2" />
                          Restaurar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}