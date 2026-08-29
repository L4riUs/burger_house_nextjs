"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DeliveryList } from "./components/DeliveryList";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DeliveryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchOrders = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profile:profiles!orders_profile_id_fkey(full_name, phone),
        guest_customer:guest_customers(full_name, phone, address),
        order_items(
          id,
          quantity,
          product:products(id, name),
          combo:combos(id, name)
        )
      `)
      .eq('fulfillment_type', 'delivery')
      .in('status', ['ready', 'out_for_delivery'])
      .order('created_at', { ascending: true });

    if (error) {
      toast.error("Error cargando entregas: " + error.message);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    const supabase = createClient();
    const channel = supabase
      .channel('delivery-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `fulfillment_type=eq.delivery,status=in.(ready,out_for_delivery)`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            setOrders(prev => {
              if (prev.some(o => o.id === newOrder.id)) return prev;
              return [...prev, newOrder].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });
            toast.info(`Nueva entrega #${newOrder.order_number} lista para tomar`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new;
            if (!['ready', 'out_for_delivery'].includes(updatedOrder.status)) {
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
    toast.success("Entregas actualizadas");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Delivery
          </h1>
          <p className="text-muted-foreground">Gestión de entregas a domicilio</p>
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
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <DeliveryList orders={orders} onRefresh={fetchOrders} />
      )}
    </div>
  );
}