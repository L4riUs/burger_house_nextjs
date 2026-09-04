"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControl } from "@/components/shared/pagination-control";
import { Loader2, PlusIcon } from "lucide-react";
import { createFinancialTransaction, listFinancialTransactions, getCurrentOpenSession } from "@/features/caja/actions";
import { createTransactionSchema } from "@/features/caja/schemas";
import { TXN_TYPE_LABELS, CURRENCY_LABELS, formatCurrency } from "@/features/caja/helpers";
import { TransactionFilters } from "@/features/caja/components/TransactionFilters";
import { useToast } from "@/hooks/use-toast";

const TXN_TYPE_OPTIONS = Object.entries(TXN_TYPE_LABELS)
  .filter(([k]) => k !== "sale")
  .map(([value, label]) => ({ value, label }));

export default function MovimientosPage() {
  const { toastSuccess, toastError } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ txn_type: "all", date_from: "", date_to: "" });

  const form = useForm({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      txn_type: "expense",
      currency: "VES",
      amount: "",
      description: "",
      cash_session_id: "",
      supplier_id: "",
    },
  });

  const txnType = form.watch("txn_type");

  const fetchTransactions = async (pageNum = page) => {
    setLoading(true);
    const params = {
      page: pageNum,
      pageSize: 20,
      txn_type: filters.txn_type !== "all" ? filters.txn_type : undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    };
    const [txnResult, sessResult] = await Promise.all([
      listFinancialTransactions(params),
      getCurrentOpenSession(),
    ]);
    setTransactions(txnResult.data || []);
    setPagination(txnResult.pagination || { page: 1, totalPages: 1, total: 0 });
    setSession(sessResult.data);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const params = {
        page,
        pageSize: 20,
        txn_type: filters.txn_type !== "all" ? filters.txn_type : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      };
      const [txnResult, sessResult] = await Promise.all([
        listFinancialTransactions(params),
        getCurrentOpenSession(),
      ]);
      if (!cancelled) {
        setTransactions(txnResult.data || []);
        setPagination(txnResult.pagination || { page: 1, totalPages: 1, total: 0 });
        setSession(sessResult.data);
        setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [page, filters.txn_type, filters.date_from, filters.date_to]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  useEffect(() => {
    if (session) {
      form.setValue("cash_session_id", session.id);
    }
  }, [session]);

  const onSubmit = async (data) => {
    const result = await createFinancialTransaction(data);
    if (result.error) {
      toastError(result.error);
    } else {
      toastSuccess(result.success);
      setDialogOpen(false);
      form.reset({ txn_type: "expense", currency: "VES", amount: "", description: "", cash_session_id: session?.id || "", supplier_id: "" });
      fetchTransactions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground">Registro manual de gastos, capitales y pagos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Movimiento</Label>
              <Controller
                name="txn_type"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona el tipo de movimiento" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TXN_TYPE_LABELS).filter(([k]) => k !== "sale").map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.txn_type && <p className="text-sm text-destructive">{form.formState.errors.txn_type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Controller
                name="currency"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona la moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CURRENCY_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.currency && <p className="text-sm text-destructive">{form.formState.errors.currency.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" step="0.01" {...form.register("amount")} />
              {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input {...form.register("description")} placeholder="Descripción del movimiento" />
              {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
            </div>
            {txnType === "supplier_payment" && (
              <div className="space-y-2">
                <Label>ID del Proveedor</Label>
                <Input {...form.register("supplier_id")} placeholder="UUID del proveedor" />
                {form.formState.errors.supplier_id && <p className="text-sm text-destructive">{form.formState.errors.supplier_id.message}</p>}
              </div>
            )}
            {txnType === "expense" && !session && (
              <p className="text-sm text-destructive">No hay sesión de caja abierta. Abra una sesión para registrar gastos.</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || (txnType === "expense" && !session)}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TransactionFilters
        filters={filters}
        onChange={handleFilterChange}
        typeOptions={TXN_TYPE_OPTIONS}
      />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Tasa</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge variant={t.txn_type === "expense" ? "destructive" : t.txn_type === "capital_out" ? "destructive" : "default"}>
                            {TXN_TYPE_LABELS[t.txn_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.description || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{t.currency}</Badge></TableCell>
                        <TableCell className="font-medium">{formatCurrency(t.amount, t.currency)}</TableCell>
                        <TableCell className="text-muted-foreground">{t.exchange_rate}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(t.created_at).toLocaleString("es-VE")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {pagination.totalPages > 1 && (
                <PaginationControl
                  className="mt-4 justify-center"
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}