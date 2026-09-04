"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControl } from "@/components/shared/pagination-control";
import { EyeIcon, BanIcon } from "lucide-react";
import { listInvoices, getInvoiceById, voidInvoiceAction } from "@/features/caja/actions";
import { INVOICE_TYPE_LABELS, CURRENCY_LABELS, formatCurrency } from "@/features/caja/helpers";
import { InvoiceFilters } from "@/features/caja/components/InvoiceFilters";
import { useToast } from "@/hooks/use-toast";

const INVOICE_TYPE_OPTIONS = Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export default function FacturasPage() {
  const { toastSuccess, toastError } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [voidDialog, setVoidDialog] = useState({ open: false, invoiceId: null });
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState({ type: "all", search: "", date_from: "", date_to: "" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const result = await listInvoices({
        page,
        pageSize: 20,
        type: filters.type !== "all" ? filters.type : undefined,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      });
      if (!cancelled) {
        setInvoices(result.data || []);
        setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
        setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [page, filters.type, filters.search, filters.date_from, filters.date_to, reloadKey]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleView = async (id) => {
    const result = await getInvoiceById(id);
    if (result.error) toastError(result.error);
    else setViewInvoice(result.data);
  };

  const handleVoid = async () => {
    if (!voidDialog.invoiceId || !voidReason.trim()) return;
    setVoiding(true);
    const result = await voidInvoiceAction({ invoice_id: voidDialog.invoiceId, reason: voidReason });
    if (result.error) {
      toastError(result.error);
    } else {
      toastSuccess(result.success);
      setVoidDialog({ open: false, invoiceId: null });
      setVoidReason("");
      setReloadKey((k) => k + 1);
    }
    setVoiding(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
        <p className="text-muted-foreground">Consulta, reimprime y anula facturas</p>
      </div>

      <InvoiceFilters
        filters={filters}
        onChange={handleFilterChange}
        typeOptions={INVOICE_TYPE_OPTIONS}
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
                    <TableHead>Nº Factura</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No hay facturas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => {
                      const isVoided = invoices.some(
                        (i) => i.type === "credit_note" && i.reference_invoice_id === inv.id
                      );
                      return (
                        <TableRow key={inv.id} className={isVoided ? "opacity-60" : ""}>
                          <TableCell className="font-mono">#{inv.invoice_number}</TableCell>
                          <TableCell>
                            <Badge variant={inv.type === "credit_note" ? "destructive" : "default"}>
                              {INVOICE_TYPE_LABELS[inv.type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {inv.order?.order_number ? `#${inv.order.order_number}` : "—"}
                          </TableCell>
                          <TableCell><Badge variant="outline">{inv.currency}</Badge></TableCell>
                          <TableCell className="font-medium">{formatCurrency(inv.total, inv.currency)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(inv.issued_at).toLocaleString("es-VE")}
                          </TableCell>
                          <TableCell className="text-right">
                            <TableRowActions
                              items={[
                                { label: "Ver", icon: EyeIcon, onClick: () => handleView(inv.id) },
                                ...(inv.type === "invoice" && !isVoided
                                  ? [{ label: "Anular", icon: BanIcon, destructive: true, onClick: () => setVoidDialog({ open: true, invoiceId: inv.id }) }]
                                  : []),
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
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

      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Factura #{viewInvoice?.invoice_number}
              {viewInvoice?.type === "credit_note" && (
                <Badge variant="destructive" className="ml-2">Nota de Crédito</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{INVOICE_TYPE_LABELS[viewInvoice.type]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Orden</p>
                  <p className="font-medium">#{viewInvoice.order?.order_number || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Moneda / Tasa</p>
                  <p className="font-medium">{viewInvoice.currency} / {viewInvoice.exchange_rate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">{formatCurrency(viewInvoice.total, viewInvoice.currency)}</p>
                </div>
              </div>

              {viewInvoice.type === "credit_note" && viewInvoice.reference_invoice_id && (
                <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                  <p className="font-medium text-destructive">Nota de crédito referenciando factura original</p>
                  <p className="text-muted-foreground">Factura original ID: {viewInvoice.reference_invoice_id.slice(0, 8)}...</p>
                </div>
              )}

              {viewInvoice.credit_notes?.length > 0 && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium">Esta factura fue anulada</p>
                  {viewInvoice.credit_notes.map((cn) => (
                    <p key={cn.id} className="text-muted-foreground">
                      Nota de crédito #{cn.invoice_number} — {new Date(cn.issued_at).toLocaleString("es-VE")}
                    </p>
                  ))}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Items</p>
                <div className="space-y-1">
                  {(viewInvoice.items_snapshot || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">{formatCurrency(item.unit_price_ves * item.quantity, "VES")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={voidDialog.open} onOpenChange={(open) => setVoidDialog({ ...voidDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular Factura</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará una <strong>nota de crédito</strong> que referencia esta factura. La factura original <strong>nunca se borra ni se modifica</strong> — simplemente quedará marcada como anulada por la nota de crédito asociada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-4 space-y-2">
            <Label>Motivo de anulación</Label>
            <Input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Motivo de la anulación..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVoidReason("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} className="bg-destructive" disabled={voiding || !voidReason.trim()}>
              {voiding && <span className="mr-2 h-4 w-4 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" />}
              Crear Nota de Crédito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
