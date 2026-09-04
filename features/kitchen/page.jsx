"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KitchenKanban } from "./components/KitchenKanban";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const KITCHEN_STATUSES = ['confirmed', 'in_kitchen', 'ready'];

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const { toastSuccess, toastError, toastInfo } = useToast();

  const fetchOrders = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profile:profiles!orders_profile_id_fkey(full_name),
        guest_customer:guest_customers(full_name),
        table:restaurant_tables(name),
        order_items(
          id,
          quantity,
          notes,
          product:products(id, name),
          combo:combos(id, name),
          order_item_extras(
            id,
            quantity,
            extra:product_extras(id, name)
          )
        )
      `)
      .in('status', KITCHEN_STATUSES)
      .order('created_at', { ascending: true });

    if (error) {
      toastError("Error cargando órdenes: " + error.message);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    const supabase = createClient();
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `status=in.(${KITCHEN_STATUSES.join(',')})`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            setOrders(prev => {
              if (prev.some(o => o.id === newOrder.id)) return prev;
              return [...prev, newOrder].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });
            toastInfo(`Nueva orden #${newOrder.order_number} recibida`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new;
            if (!KITCHEN_STATUSES.includes(updatedOrder.status)) {
              setOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
            } else {
              setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    fetchOrders();
    toastSuccess("Órdenes actualizadas");
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'confirmed': return { label: 'Pendientes', color: 'border-l-yellow-500', bg: 'bg-yellow-50', empty: 'No hay órdenes pendientes' };
      case 'in_kitchen': return { label: 'En Cocina', color: 'border-l-orange-500', bg: 'bg-orange-50', empty: 'Nada en preparación' };
      case 'ready': return { label: 'Listas para entregar/servir', color: 'border-l-green-500', bg: 'bg-green-50', empty: 'Nada listo' };
      default: return { label: status, color: '', bg: '', empty: '' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cocina</h1>
          <p className="text-muted-foreground">Gestión de órdenes en preparación</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1.5 text-sm px-2 py-1 rounded-full",
            realtimeConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          )}>
            <span className={cn("h-2 w-2 rounded-full", realtimeConnected ? "bg-green-500" : "bg-red-500")} />
            {realtimeConnected ? "Tiempo real conectado" : "Desconectado"}
          </span>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {KITCHEN_STATUSES.map((status) => (
            <div key={status} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <KitchenKanban orders={orders} />
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";