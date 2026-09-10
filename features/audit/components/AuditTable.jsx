"use client";

import { useState } from "react";
import { EyeIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ACTION_LABELS = {
  insert: "Creación",
  update: "Actualización",
  delete: "Eliminación",
  role_change: "Cambio de Rol",
  order_status_change: "Cambio Estado Orden",
  cash_session_open: "Apertura Caja",
  cash_session_close: "Cierre Caja",
  invoice_void: "Anulación Factura",
  payment_method_activate: "Activación Método Pago",
  payment_method_deactivate: "Desactivación Método Pago",
  status_change: "Cambio Estado",
};

const ACTION_COLORS = {
  insert: "bg-emerald-100 text-emerald-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  role_change: "bg-purple-100 text-purple-800",
  order_status_change: "bg-orange-100 text-orange-800",
  cash_session_open: "bg-emerald-100 text-emerald-800",
  cash_session_close: "bg-amber-100 text-amber-800",
  invoice_void: "bg-red-100 text-red-800",
  payment_method_activate: "bg-emerald-100 text-emerald-800",
  payment_method_deactivate: "bg-gray-100 text-gray-800",
  status_change: "bg-blue-100 text-blue-800",
};

function formatDiff(diff) {
  if (!diff) return "—";
  try {
    const obj = typeof diff === "string" ? JSON.parse(diff) : diff;
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(diff);
  }
}

export function AuditTable({ logs = [], onViewDiff }) {
  const [selectedLog, setSelectedLog] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewDiff = (log) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Fecha</TableHead>
              <TableHead className="w-[140px]">Acción</TableHead>
              <TableHead className="w-[120px]">Entidad</TableHead>
              <TableHead className="w-[140px]">Actor</TableHead>
              <TableHead>Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No hay registros de auditoría con los filtros seleccionados
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="text-sm font-mono whitespace-nowrap">
                    {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: es }) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"}>
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.entity}</TableCell>
                  <TableCell className="text-sm">
                    {log.actor?.full_name || "Sistema"}
                    {log.actor?.role && <span className="ml-1 text-xs text-muted-foreground">({log.actor.role})</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDiff(log)}
                      className="h-8 px-2"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Detalle de Auditoría</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedLog?.entity} • {ACTION_LABELS[selectedLog?.action] || selectedLog?.action}
              • {selectedLog?.created_at ? format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es }) : "—"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-auto">
            {selectedLog && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="font-medium">ID Registro</p>
                    <p className="font-mono text-xs text-muted-foreground break-all">{selectedLog.id}</p>
                  </div>
                  <div>
                    <p className="font-medium">Entidad ID</p>
                    <p className="font-mono text-xs text-muted-foreground break-all">{selectedLog.entity_id || "—"}</p>
                  </div>
                  <div>
                    <p className="font-medium">Actor</p>
                    <p>{selectedLog.actor?.full_name || "Sistema"} <span className="text-muted-foreground">({selectedLog.actor?.role || "—"})</span></p>
                  </div>
                  <div>
                    <p className="font-medium">Acción</p>
                    <Badge variant="secondary" className={ACTION_COLORS[selectedLog.action] || "bg-gray-100 text-gray-800"}>
                      {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-1">Diff (JSON)</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto font-mono max-h-64">
                    {formatDiff(selectedLog.diff)}
                  </pre>
                </div>
              </>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSelectedLog(null); setDialogOpen(false); }}>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}