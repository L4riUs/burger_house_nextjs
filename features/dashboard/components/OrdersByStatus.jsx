"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_kitchen: "En cocina",
  ready: "Lista",
  out_for_delivery: "En entrega",
  served: "Servida",
  completed: "Completada",
  cancelled: "Cancelada",
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_kitchen: "bg-orange-100 text-orange-800",
  ready: "bg-emerald-100 text-emerald-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  served: "bg-cyan-100 text-cyan-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function OrdersByStatus({ orders = [], loading = false }) {
  const allStatuses = [
    "pending",
    "confirmed",
    "in_kitchen",
    "ready",
    "out_for_delivery",
    "served",
    "completed",
    "cancelled",
  ];

  const statusCounts = allStatuses.map((status) => {
    const found = orders.find((o) => o.status === status);
    return {
      status,
      label: STATUS_LABELS[status],
      count: found ? Number(found.count) : 0,
      color: STATUS_COLORS[status],
    };
  });

  const total = statusCounts.reduce((sum, s) => sum + s.count, 0);

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
              <TableCell className="text-right"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
              <TableCell className="text-right"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statusCounts
            .filter((s) => s.count > 0 || ["pending", "confirmed", "in_kitchen", "ready", "completed"].includes(s.status))
            .map((s) => (
              <TableRow key={s.status}>
                <TableCell>
                  <Badge className={s.color} variant="secondary">
                    {s.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{formatNumber(s.count)}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {total > 0 ? ((s.count / total) * 100).toFixed(1) : 0}%
                </TableCell>
              </TableRow>
            ))}
          <TableRow className="border-t font-semibold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right font-mono">{formatNumber(total)}</TableCell>
            <TableCell className="text-right">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}