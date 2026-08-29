"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listOrders } from "./actions";
import { OrderTable } from "./components/OrderTable";
import { OrderCards } from "./components/OrderCards";
import { OrderFilters } from "./components/OrderFilters";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Filter, ChevronLeft, ChevronRight, Plus } from "lucide-react";

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
  const [filters, setFilters] = useState({
    status: [],
    fulfillment_type: [],
    channel: [],
    date_from: '',
    date_to: '',
    search: '',
  });

  const fetchOrders = async () => {
    setLoading(true);
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
      status: filters.status.length ? filters.status : undefined,
      fulfillment_type: filters.fulfillment_type.length ? filters.fulfillment_type : undefined,
      channel: filters.channel.length ? filters.channel : undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      search: filters.search || undefined,
    };

    const result = await listOrders(params);
    if (result.error) {
      console.error("Error fetching orders:", result.error);
    } else {
      setOrders(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    const status = searchParams.getAll('status');
    const fulfillment = searchParams.getAll('fulfillment_type');
    const channel = searchParams.getAll('channel');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const date_from = searchParams.get('date_from') || '';
    const date_to = searchParams.get('date_to') || '';

    setFilters(prev => ({
      ...prev,
      status,
      fulfillment_type: fulfillment,
      channel,
      search,
      date_from,
      date_to,
    }));
    setPagination(prev => ({ ...prev, page }));
  }, [searchParams]);

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, filters]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
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
    setPagination(prev => ({ ...prev, page }));
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/orders?${params.toString()}`, { scroll: false });
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes</h1>
          <p className="text-muted-foreground">Gestión unificada de pedidos, cocina y delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchOrders} disabled={loading}>
            <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => router.push("/admin/pos")}>
            <Plus className="h-4 w-4 mr-2" />
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

      <Tabs value={viewMode} onValueChange={handleViewModeChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="table">Tabla</TabsTrigger>
          <TabsTrigger value="cards">Tarjetas</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <OrderTable orders={orders} />
              {pagination.totalPages > 1 && (
                <Pagination
                  className="mt-4 justify-center"
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : (
            <>
              <OrderCards orders={orders} />
              {pagination.totalPages > 1 && (
                <Pagination
                  className="mt-4 justify-center"
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <div className="text-sm text-muted-foreground text-center">
        Mostrando {orders.length} de {pagination.total} órdenes
      </div>
    </div>
  );
}