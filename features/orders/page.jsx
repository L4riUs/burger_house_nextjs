"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listOrders } from "./actions";
import { OrderTable } from "./components/OrderTable";
import { OrderCards } from "./components/OrderCards";
import { OrderFilters } from "./components/OrderFilters";
import { PaginationControl } from "@/components/shared/pagination-control";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LayoutGridIcon, ListIcon, PlusIcon, RefreshCwIcon } from "lucide-react";

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_kitchen', label: 'En Cocina' },
  { value: 'ready', label: 'Lista' },
  { value: 'out_for_delivery', label: 'En Reparto' },
  { value: 'served', label: 'Servida' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
];

const FULFILLMENT_OPTIONS = [
  { value: 'dine_in', label: 'Comer en local' },
  { value: 'pickup', label: 'Recoger' },
  { value: 'delivery', label: 'Delivery' },
];

const CHANNEL_OPTIONS = [
  { value: 'storefront', label: 'Tienda Online' },
  { value: 'pos', label: 'Mostrador (POS)' },
  { value: 'phone', label: 'Teléfono/WhatsApp' },
];

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');

  // Los filtros derivados SIEMPRE de la URL (fuente de verdad) para no duplicar
  // estado y evitar dobles fetch por referencias inestables.
  const statuses = searchParams.getAll('status');
  const fulfillments = searchParams.getAll('fulfillment_type');
  const channels = searchParams.getAll('channel');
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const date_from = searchParams.get('date_from') || '';
  const date_to = searchParams.get('date_to') || '';

  const filters = {
    status: statuses,
    fulfillment_type: fulfillments,
    channel: channels,
    date_from,
    date_to,
    search,
  };

  const filterKey = `${page}|${statuses.join(",")}|${fulfillments.join(",")}|${channels.join(",")}|${date_from}|${date_to}|${search}`;
  const pageSize = pagination.pageSize;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = {
      page,
      pageSize,
      ...filters,
      status: statuses.length ? statuses : undefined,
      fulfillment_type: fulfillments.length ? fulfillments : undefined,
      channel: channels.length ? channels : undefined,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
      search: search || undefined,
    };

    const result = await listOrders(params);
    if (result.error) {
      console.error("Error fetching orders:", result.error);
    } else {
      setOrders(result.data);
      setPagination(prev => ({
        ...prev,
        page,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      }));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filterKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  const handleFilterChange = useCallback((newFilters) => {
    const params = new URLSearchParams();
    if (newFilters.status.length) newFilters.status.forEach(s => params.append('status', s));
    if (newFilters.fulfillment_type.length) newFilters.fulfillment_type.forEach(f => params.append('fulfillment_type', f));
    if (newFilters.channel.length) newFilters.channel.forEach(c => params.append('channel', c));
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.date_from) params.set('date_from', newFilters.date_from);
    if (newFilters.date_to) params.set('date_to', newFilters.date_to);
    router.push(`/admin/orders?${params.toString()}`, { scroll: false });
  }, [router]);

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/orders?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes</h1>
          <p className="text-muted-foreground">Gestión unificada de pedidos, cocina y delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button onClick={() => router.push("/admin/pos")}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      <OrderFilters
        filters={filters}
        onChange={handleFilterChange}
        statusOptions={STATUS_OPTIONS}
        fulfillmentOptions={FULFILLMENT_OPTIONS}
        channelOptions={CHANNEL_OPTIONS}
      />

      {loading ? (
        viewMode === "table" ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        )
      ) : viewMode === "table" ? (
        <>
          <OrderTable orders={orders} onRefresh={fetchOrders} />
          {pagination.totalPages > 1 && (
            <PaginationControl
              className="mt-4 justify-center"
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <>
          <OrderCards orders={orders} onRefresh={fetchOrders} />
          {pagination.totalPages > 1 && (
            <PaginationControl
              className="mt-4 justify-center"
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      <div className="text-sm text-muted-foreground text-center">
        Mostrando {orders.length} de {pagination.total} órdenes
      </div>
    </div>
  );
}