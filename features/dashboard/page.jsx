"use client";

import { useEffect, useState } from "react";
import { Loader2, DollarSignIcon, ClipboardListIcon, PackageIcon, UsersIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getDashboardKPIs } from "./actions";
import { StatCard } from "./components/StatCard";
import { DashboardFilters } from "./components/DashboardFilters";
import { TopProductsTable } from "./components/TopProductsTable";
import { OrdersByStatus } from "./components/OrdersByStatus";
import { CashStatusWidget } from "./components/CashStatusWidget";
import { StockAlertWidget } from "./components/StockAlertWidget";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    preset: "last_30_days",
    date_from: null,
    date_to: null,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getDashboardKPIs(filters);
      if (result.error) {
        console.error(result.error);
      } else {
        setData(result.data);
      }
    } catch (err) {
      console.error("[DashboardPage] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const sales = data?.sales || {
    total_ves: 0,
    total_usd: 0,
    orders_count: 0,
    avg_ticket_ves: 0,
    avg_ticket_usd: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Panel de control — Burger House
          </p>
        </div>
        <DashboardFilters
          preset={filters.preset}
          dateFrom={filters.date_from}
          dateTo={filters.date_to}
          onChange={handleFiltersChange}
          className="w-full sm:w-64"
        />
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas Totales"
          value={formatCurrency(sales.total_ves, "VES")}
          sub={formatCurrency(sales.total_usd, "USD")}
          icon={DollarSignIcon}
          accent="orange"
          loading={loading}
        />
        <StatCard
          label="Órdenes"
          value={formatNumber(sales.orders_count)}
          sub={sales.orders_count === 1 ? "orden" : "órdenes"}
          icon={ClipboardListIcon}
          accent="emerald"
          loading={loading}
        />
        <StatCard
          label="Ticket Promedio"
          value={formatCurrency(sales.avg_ticket_ves, "VES")}
          sub={formatCurrency(sales.avg_ticket_usd, "USD")}
          icon={UsersIcon}
          accent="blue"
          loading={loading}
        />
        <StatCard
          label="Productos Vendidos"
          value={formatNumber(data?.top_products?.reduce((sum, p) => sum + Number(p.total_quantity), 0) || 0)}
          sub="unidades totales"
          icon={PackageIcon}
          accent="purple"
          loading={loading}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Productos/Combos Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <TopProductsTable
                products={data?.top_products || []}
                combos={data?.top_combos || []}
                loading={loading}
              />
            </CardContent>
          </Card>

          {/* Orders by Status + Sales by Channel/Fulfillment */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Órdenes por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersByStatus
                  orders={data?.orders_by_status || []}
                  loading={loading}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ventas por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.sales_by_channel || []).map((item) => (
                    <div key={item.channel} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {item.channel}
                        </Badge>
                        <span className="text-sm font-medium">{formatNumber(item.orders_count)} órdenes</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">{formatCurrency(item.total_ves, "VES")}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.total_usd, "USD")}</p>
                      </div>
                    </div>
                  ))}
                  {(data?.sales_by_channel || []).length === 0 && !loading && (
                    <p className="text-center text-muted-foreground py-4">Sin datos</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ventas por Tipo de Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.sales_by_fulfillment || []).map((item) => (
                    <div key={item.fulfillment_type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {item.fulfillment_type.replace("_", " ")}
                        </Badge>
                        <span className="text-sm font-medium">{formatNumber(item.orders_count)} órdenes</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">{formatCurrency(item.total_ves, "VES")}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.total_usd, "USD")}</p>
                      </div>
                    </div>
                  ))}
                  {(data?.sales_by_fulfillment || []).length === 0 && !loading && (
                    <p className="text-center text-muted-foreground py-4">Sin datos</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          <CashStatusWidget
            session={data?.cash_session || null}
            loading={loading}
          />

          <StockAlertWidget
            alerts={data?.low_stock_alerts || []}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}