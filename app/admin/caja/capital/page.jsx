"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUpIcon, TrendingDownIcon, ScaleIcon } from "lucide-react";
import { getCapitalReport, listFinancialTransactions } from "@/features/caja/actions";
import { TXN_TYPE_LABELS, formatCurrency } from "@/features/caja/helpers";
import { TransactionFilters } from "@/features/caja/components/TransactionFilters";

const CAPITAL_TYPE_OPTIONS = [
  { value: "capital_in", label: "Aportes de capital" },
  { value: "capital_out", label: "Retiros de capital" },
];

export default function CapitalPage() {
  const [report, setReport] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ txn_type: "all", date_from: "", date_to: "" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const [reportResult, txnResult] = await Promise.all([
        getCapitalReport(),
        listFinancialTransactions({
          txn_type: "capital_in",
          pageSize: 100,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        }),
      ]);
      if (cancelled) return;
      setReport(reportResult.data);

      if (filters.txn_type === "capital_out") {
        const out = await listFinancialTransactions({
          txn_type: "capital_out",
          pageSize: 100,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        });
        const allTxns = [...(out.data || [])].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setTransactions(allTxns);
        setLoading(false);
        return;
      }

      const txnResult2 = await listFinancialTransactions({
        txn_type: "capital_out",
        pageSize: 100,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      });
      const allTxns = [...(txnResult.data || []), ...(txnResult2.data || [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      if (!cancelled) setTransactions(allTxns);
      setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [filters.txn_type, filters.date_from, filters.date_to]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Capital</h1>
        <p className="text-muted-foreground">Balance acumulado de aportes y retiros</p>
      </div>

      <TransactionFilters
        filters={filters}
        onChange={setFilters}
        typeOptions={CAPITAL_TYPE_OPTIONS}
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : report && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4 text-green-600" /> Aportes de Capital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(report.capital_in_ves, "VES")}</p>
              <p className="text-lg font-medium text-green-600">{formatCurrency(report.capital_in_usd, "USD")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDownIcon className="h-4 w-4 text-red-600" /> Retiros de Capital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold text-red-600">{formatCurrency(report.capital_out_ves, "VES")}</p>
              <p className="text-lg font-medium text-red-600">{formatCurrency(report.capital_out_usd, "USD")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ScaleIcon className="h-4 w-4" /> Balance Neto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className={`text-2xl font-bold ${report.balance_ves >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(report.balance_ves, "VES")}
              </p>
              <p className={`text-lg font-medium ${report.balance_usd >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(report.balance_usd, "USD")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos de Capital</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
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
                      No hay movimientos de capital registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge variant={t.txn_type === "capital_in" ? "default" : "destructive"}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
