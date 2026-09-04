"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControl } from "@/components/shared/pagination-control";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, LockIcon, UnlockIcon } from "lucide-react";
import { openCashSession, closeCashSession, getCurrentOpenSession, calculateExpectedAmountsForSession, listCashSessions } from "@/features/caja/actions";
import { openCashSessionSchema, closeCashSessionSchema } from "@/features/caja/schemas";
import { formatCurrency, formatNumber } from "@/features/caja/helpers";
import { useToast } from "@/hooks/use-toast";

export default function CashSessionPage() {
  const { toastSuccess, toastError } = useToast();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [expected, setExpected] = useState(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeResult, setCloseResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);

  const formatSigned = (value, currency) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${formatNumber(value)} ${currency}`;
  };

  const openForm = useForm({
    resolver: zodResolver(openCashSessionSchema),
    defaultValues: { opening_amount_ves: 0, opening_amount_usd: 0 },
  });

  const closeForm = useForm({
    resolver: zodResolver(closeCashSessionSchema),
    defaultValues: { counted_amount_ves: 0, counted_amount_usd: 0 },
  });

  const fetchSession = async () => {
    setLoading(true);
    const result = await getCurrentOpenSession();
    setSession(result.data);
    setLoading(false);
  };

  const fetchHistory = async (pageNum = 1) => {
    setHistoryLoading(true);
    const result = await listCashSessions({ page: pageNum, pageSize: 10 });
    setHistory(result.data || []);
    setHistoryPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
    setHistoryLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const result = await getCurrentOpenSession();
      if (!cancelled) {
        setSession(result.data);
        setLoading(false);
      }
      const historyResult = await listCashSessions({ page: 1, pageSize: 10 });
      if (!cancelled) {
        setHistory(historyResult.data || []);
        setHistoryPagination(historyResult.pagination || { page: 1, totalPages: 1, total: 0 });
        setHistoryLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (historyPage === 1) return;
    let cancelled = false;
    async function run() {
      const result = await listCashSessions({ page: historyPage, pageSize: 10 });
      if (!cancelled) {
        setHistory(result.data || []);
        setHistoryPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    }
    run();
    return () => { cancelled = true; };
  }, [historyPage]);

  const onOpen = async (data) => {
    const result = await openCashSession(data);
    if (result.error) {
      toastError(result.error);
    } else {
      toastSuccess(result.success);
      openForm.reset();
      fetchSession();
    }
  };

  const onPreClose = async () => {
    if (!session) return;
    setClosing(true);
    const result = await calculateExpectedAmountsForSession(session.id);
    setExpected(result.error ? null : result.data);
    closeForm.setValue("session_id", session.id);
    setCloseDialogOpen(true);
    setClosing(false);
  };

  const onConfirmClose = async (data) => {
    setClosing(true);
    const result = await closeCashSession({ ...data, session_id: session.id });
    if (result.error) {
      toastError(result.error);
      setClosing(false);
    } else {
      toastSuccess(result.success);
      setCloseResult(result);
      setCloseDialogOpen(false);
      setClosing(false);
      fetchSession();
      fetchHistory(1);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sesión de Caja</h1>
        <p className="text-muted-foreground">Apertura y cierre de caja diaria</p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : session ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UnlockIcon className="h-5 w-5 text-green-600" />
                Sesión Abierta
                <Badge className="bg-green-100 text-green-800">Activa</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Monto Inicial VES</p>
                  <p className="text-xl font-bold">{formatCurrency(session.opening_amount_ves, "VES")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Inicial USD</p>
                  <p className="text-xl font-bold">{formatCurrency(session.opening_amount_usd, "USD")}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Abierta el {new Date(session.opened_at).toLocaleString("es-VE")}
              </div>
              <Button onClick={onPreClose} disabled={closing}>
                {closing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cerrar Sesión
              </Button>
            </CardContent>
          </Card>

          {closeResult && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado del Último Cierre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Esperado VES:</span>
                  <span className="font-medium">{formatCurrency(closeResult.expected, "VES")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contado VES:</span>
                  <span className="font-medium">{formatCurrency(closeResult.counted, "VES")}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Diferencia VES:</span>
                  <span className={`font-bold ${closeResult.difference_ves >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {closeResult.difference_ves >= 0 ? "+" : ""}{formatNumber(closeResult.difference_ves)} VES
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockIcon className="h-5 w-5" />
              Abrir Nueva Sesión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={openForm.handleSubmit(onOpen)} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="opening_amount_ves">Monto Inicial VES</Label>
                <Input
                  id="opening_amount_ves"
                  type="number"
                  step="0.01"
                  {...openForm.register("opening_amount_ves")}
                />
                {openForm.formState.errors.opening_amount_ves && (
                  <p className="text-sm text-destructive">{openForm.formState.errors.opening_amount_ves.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="opening_amount_usd">Monto Inicial USD</Label>
                <Input
                  id="opening_amount_usd"
                  type="number"
                  step="0.01"
                  {...openForm.register("opening_amount_usd")}
                />
                {openForm.formState.errors.opening_amount_usd && (
                  <p className="text-sm text-destructive">{openForm.formState.errors.opening_amount_usd.message}</p>
                )}
              </div>
              <Button type="submit">
                <UnlockIcon className="mr-2 h-4 w-4" />
                Abrir Caja
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial de Cierres de Caja</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No hay cierres de caja registrados</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Esperado VES</TableHead>
                    <TableHead className="text-right">Contado VES</TableHead>
                    <TableHead className="text-right">Diferencia VES</TableHead>
                    <TableHead className="text-right">Esperado USD</TableHead>
                    <TableHead className="text-right">Contado USD</TableHead>
                    <TableHead className="text-right">Diferencia USD</TableHead>
                    <TableHead>Abrió</TableHead>
                    <TableHead>Cerró</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => {
                    const diffVes = Number(h.counted_amount_ves) - Number(h.expected_amount_ves || 0);
                    const diffUsd = Number(h.counted_amount_usd) - Number(h.expected_amount_usd || 0);
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(h.closed_at || h.opened_at).toLocaleString("es-VE")}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(h.expected_amount_ves ?? 0)}</TableCell>
                        <TableCell className="text-right">{formatNumber(h.counted_amount_ves ?? 0)}</TableCell>
                        <TableCell className={`text-right font-medium ${diffVes >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatSigned(diffVes, "VES")}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(h.expected_amount_usd ?? 0)}</TableCell>
                        <TableCell className="text-right">{formatNumber(h.counted_amount_usd ?? 0)}</TableCell>
                        <TableCell className={`text-right font-medium ${diffUsd >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatSigned(diffUsd, "USD")}
                        </TableCell>
                        <TableCell>{h.opened_by_profile?.full_name || "—"}</TableCell>
                        <TableCell>{h.closed_by_profile?.full_name || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-end">
                <PaginationControl
                  page={historyPagination.page}
                  totalPages={historyPagination.totalPages}
                  onPageChange={setHistoryPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar Sesión de Caja</AlertDialogTitle>
            <AlertDialogDescription>
              Ingrese el monto contado en cada moneda. Se comparará con el monto esperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {expected && (
            <div className="space-y-4 px-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Esperado VES</p>
                  <p className="font-bold">{formatCurrency(expected.expected_ves, "VES")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Esperado USD</p>
                  <p className="font-bold">{formatCurrency(expected.expected_usd, "USD")}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="counted_amount_ves">Contado VES</Label>
                <Input
                  id="counted_amount_ves"
                  type="number"
                  step="0.01"
                  {...closeForm.register("counted_amount_ves")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counted_amount_usd">Contado USD</Label>
                <Input
                  id="counted_amount_usd"
                  type="number"
                  step="0.01"
                  {...closeForm.register("counted_amount_usd")}
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={closeForm.handleSubmit(onConfirmClose)} disabled={closing}>
              {closing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Cierre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
