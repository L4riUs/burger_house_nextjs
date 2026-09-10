"use client";

import { WalletIcon, AlertCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function CashStatusWidget({ session = null, loading = false }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5" />
            Estado de Caja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <AlertCircleIcon className="h-5 w-5" />
            Caja Cerrada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay sesión de caja abierta</p>
          <div className="mt-4 text-sm text-orange-600">
            Abra una sesión para comenzar a operar
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOpen = session.is_open;
  const diffVes = session.counted_amount_ves !== null && session.expected_amount_ves !== null
    ? Number(session.counted_amount_ves) - Number(session.expected_amount_ves)
    : null;
  const diffUsd = session.counted_amount_usd !== null && session.expected_amount_usd !== null
    ? Number(session.counted_amount_usd) - Number(session.expected_amount_usd)
    : null;

  return (
    <Card className={isOpen ? "border-emerald-200" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletIcon className={isOpen ? "h-5 w-5 text-emerald-600" : "h-5 w-5"} />
          {isOpen ? "Caja Abierta" : "Caja Cerrada"}
          <Badge variant={isOpen ? "default" : "secondary"} className="ml-2">
            {isOpen ? "Activa" : "Cerrada"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Monto Inicial</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">{formatCurrency(session.opening_amount_ves, "VES")}</span>
              <span className="text-sm text-muted-foreground">{formatCurrency(session.opening_amount_usd, "USD")}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Apertura</p>
            <p className="text-sm font-medium">{session.opened_at ? new Date(session.opened_at).toLocaleString("es-VE") : "—"}</p>
            <p className="text-xs text-muted-foreground">Por: {session.opened_by_name || "—"}</p>
          </div>
        </div>

        {isOpen && session.expected_amount_ves !== null && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Arqueo en tiempo real</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Esperado VES</p>
                <p className="text-lg font-bold">{formatCurrency(session.expected_amount_ves, "VES")}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(session.expected_amount_usd, "USD")}</p>
              </div>
              {diffVes !== null && diffUsd !== null && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Diferencia</p>
                  <p className={`text-lg font-bold ${diffVes >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {diffVes >= 0 ? "+" : ""}{formatNumber(diffVes)} VES
                  </p>
                  <p className={`text-xs ${diffUsd >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {diffUsd >= 0 ? "+" : ""}{formatNumber(diffUsd)} USD
                  </p>
                </div>
              )}
              {diffVes === null && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Contado</p>
                  <p className="text-lg font-bold text-muted-foreground">Pendiente</p>
                  <p className="text-xs text-muted-foreground">Ingrese monto al cerrar</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!isOpen && session.counted_amount_ves !== null && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Cierre realizado</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Contado VES</p>
                <p className="text-lg font-bold">{formatCurrency(session.counted_amount_ves, "VES")}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(session.counted_amount_usd, "USD")}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Diferencia final</p>
                <p className={`text-lg font-bold ${diffVes >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {diffVes >= 0 ? "+" : ""}{formatNumber(diffVes)} VES
                </p>
                <p className={`text-xs ${diffUsd >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {diffUsd >= 0 ? "+" : ""}{formatNumber(diffUsd)} USD
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Cerrado por: {session.closed_by_name || "—"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}