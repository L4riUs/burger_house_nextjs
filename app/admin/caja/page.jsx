"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletIcon, LockIcon, UnlockIcon, ReceiptIcon, TrendingUpIcon, PlusIcon } from "lucide-react";
import { getCurrentOpenSession } from "@/features/caja/actions";
import { formatCurrency } from "@/features/caja/helpers";

export default function CashDashboardPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeOpen, setTimeOpen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const result = await getCurrentOpenSession();
      if (!cancelled) {
        setSession(result.data);
        if (result.data) {
          setTimeOpen(Math.floor((Date.now() - new Date(result.data.opened_at).getTime()) / 60000));
        }
        setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Caja</h1>
        <p className="text-muted-foreground">Resumen de la sesión de caja actual</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <WalletIcon className="h-4 w-4" /> Estado de Caja
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : session ? (
              <div className="space-y-1">
                <Badge className="bg-green-100 text-green-800">Abierta</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Abierta hace {timeOpen < 60 ? `${timeOpen} min` : `${Math.floor(timeOpen / 60)}h ${timeOpen % 60}min`}
                </p>
              </div>
            ) : (
              <Badge variant="outline">Cerrada</Badge>
            )}
          </CardContent>
        </Card>

        {session && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monto Inicial VES</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(session.opening_amount_ves, "VES")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monto Inicial USD</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(session.opening_amount_usd, "USD")}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/caja/sesion">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 pt-6">
              {session ? (
                <UnlockIcon className="h-8 w-8 text-green-600" />
              ) : (
                <LockIcon className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">{session ? "Cerrar Caja" : "Abrir Caja"}</p>
                <p className="text-sm text-muted-foreground">
                  {session ? "Realizar arqueo y cerrar sesión" : "Iniciar nueva sesión"}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/caja/movimientos">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 pt-6">
              <ReceiptIcon className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium">Movimientos</p>
                <p className="text-sm text-muted-foreground">Registrar gasto o capital</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/caja/facturas">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 pt-6">
              <ReceiptIcon className="h-8 w-8 text-orange-600" />
              <div>
                <p className="font-medium">Facturas</p>
                <p className="text-sm text-muted-foreground">Consultar y anular</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/caja/capital">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 pt-6">
              <TrendingUpIcon className="h-8 w-8 text-purple-600" />
              <div>
                <p className="font-medium">Capital</p>
                <p className="text-sm text-muted-foreground">Balance acumulado</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
