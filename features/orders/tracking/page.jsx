"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, Utensils, Package, CheckCircle, Clock, MapPin, User, AlertCircle, ChefHat } from "lucide-react";
import { getStatusLabel, getStatusColor, ORDER_STATUSES, getValidTransitions } from "@/features/orders/state-machine";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: Clock, description: 'Tu orden ha sido recibida y está pendiente de confirmación' },
  confirmed: { label: 'Confirmada', icon: CheckCircle, description: 'Tu orden ha sido confirmada y pasará a cocina pronto' },
  in_kitchen: { label: 'En Cocina', icon: ChefHat, description: 'Tu orden está siendo preparada' },
  ready: { label: 'Lista', icon: CheckCircle, description: 'Tu orden está lista para ser servida o entregada' },
  out_for_delivery: { label: 'En Reparto', icon: Truck, description: 'Tu orden está en camino' },
  served: { label: 'Servida', icon: Utensils, description: 'Tu orden ha sido servida en la mesa' },
  completed: { label: 'Completada', icon: CheckCircle, description: 'Tu orden ha sido completada' },
  cancelled: { label: 'Cancelada', icon: AlertCircle, description: 'Tu orden ha sido cancelada' },
};

const STATUS_ORDER = ['pending', 'confirmed', 'in_kitchen', 'ready', 'out_for_delivery', 'served', 'completed'];

export default function OrderTrackingPage({ params }) {
  const { orderNumber } = params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchOrder = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profile:profiles!orders_profile_id_fkey(full_name, phone),
          guest_customer:guest_customers(full_name, phone, address),
          table:restaurant_tables(name),
          payment_method:payment_methods(name),
          order_items(
            id,
            quantity,
            unit_price_ves,
            unit_price_usd,
            notes,
            product:products(id, name, image_url),
            combo:combos(id, name, image_url),
            order_item_extras(
              id,
              quantity,
              unit_price_ves,
              unit_price_usd,
              extra:product_extras(id, name)
            )
          ),
          order_status_history(
            id,
            from_status,
            to_status,
            changed_by,
            created_at,
            changed_by_profile:profiles!order_status_history_changed_by_fkey(full_name)
          )
        `)
        .eq('order_number', parseInt(orderNumber))
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    const supabase = createClient();
    const channel = supabase
      .channel(`tracking-${orderNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_number=eq.${orderNumber}`,
        },
        (payload) => {
          const updatedOrder = payload.new;
          setOrder(prev => prev ? { ...prev, ...updatedOrder } : null);
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando orden #{orderNumber}...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Orden no encontrada</h1>
          <p className="text-muted-foreground">No se encontró la orden #{orderNumber}</p>
        </div>
      </div>
    );
  }

  const currentStatus = order.status;
  const currentStatusIndex = STATUS_ORDER.indexOf(currentStatus);
  const isCompleted = ['completed', 'cancelled'].includes(currentStatus);
  const isDelivery = order.fulfillment_type === 'delivery';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Seguimiento de Orden</h1>
          <p className="text-muted-foreground mt-1">Orden <span className="font-mono font-bold">#{order.order_number}</span></p>
        </div>

        <div className={cn(
          "flex items-center gap-1.5 text-sm px-3 py-2 rounded-full",
          realtimeConnected ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
        )}>
          <span className={cn("h-2 w-2 rounded-full", realtimeConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse")} />
          {realtimeConnected ? "Actualización en tiempo real" : "Conectando..."}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className={cn("px-3 py-1 rounded-full text-sm font-medium", getStatusColor(currentStatus))}>
                  {STATUS_CONFIG[currentStatus]?.label || currentStatus}
                </span>
              </CardTitle>
              <div className="text-right text-sm text-muted-foreground">
                <p>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                <p>{order.currency} {formatCurrency(order.total_ves)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{STATUS_CONFIG[currentStatus]?.description}</p>

            <div className="space-y-3 mb-6">
              {STATUS_ORDER.map((status, index) => {
                const config = STATUS_CONFIG[status];
                const isCurrent = index === currentStatusIndex;
                const isPast = index < currentStatusIndex;
                const isFuture = index > currentStatusIndex;

                return (
                  <div
                    key={status}
                    className={cn(
                      "flex items-center gap-4 relative",
                      isCurrent ? "text-primary" : isPast ? "text-green-600" : "text-muted-foreground"
                    )}
                  >
                    {index < STATUS_ORDER.length - 1 && (
                      <div className={cn(
                        "absolute left-5 top-12 bottom-0 w-0.5",
                        isPast || isCurrent ? "bg-green-500" : "bg-muted"
                      )} />
                    )}
                    <div className={cn(
                      "relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                      isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                      isPast ? "bg-green-500 text-white" : "bg-muted"
                    )}>
                      {isCurrent ? (
                        <config.icon className="h-5 w-5 animate-pulse" />
                      ) : isPast ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <config.icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn("font-medium", isCurrent && "text-primary")}>{config.label}</p>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                );
              })}

              {isDelivery && currentStatus === 'out_for_delivery' && (
                <div className="flex items-center gap-4 relative">
                  <div className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 text-white">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-blue-600">En camino</p>
                    <p className="text-sm text-muted-foreground">Tu repartidor está en camino a tu dirección</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5" /> Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{order.profile?.full_name || order.guest_customer?.full_name || 'Cliente'}</p>
              {(order.profile?.phone || order.guest_customer?.phone) && (
                <p className="text-sm text-muted-foreground">{order.profile?.phone || order.guest_customer?.phone}</p>
              )}
              {(order.guest_customer?.address || order.delivery_address) && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {order.guest_customer?.address || order.delivery_address}
                </p>
              )}
              {order.table && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  Mesa: {order.table.name}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-5 w-5" /> Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="capitalize">{order.fulfillment_type === 'dine_in' ? 'Comer en local' : order.fulfillment_type === 'pickup' ? 'Recoger en local' : 'Delivery'}</p>
              <p className="text-sm text-muted-foreground">Método: {order.payment_method?.name || 'No especificado'}</p>
              <p className="font-medium">{formatCurrency(order.total_ves)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5" /> Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.product?.name || item.combo?.name || 'Item'}</span>
                      {item.combo_id && <Badge variant="secondary" className="text-xs">Combo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">Cant: {item.quantity} × {formatCurrency(item.unit_price_ves)}</p>
                    {item.order_item_extras && item.order_item_extras.length > 0 && (
                      <div className="mt-2 ml-4 space-y-1 border-l-2 border-border pl-2">
                        {item.order_item_extras.map((extra) => (
                          <div key={extra.id} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>+ {extra.extra?.name || 'Extra'}</span>
                            <span>×{extra.quantity}</span>
                            <span className="font-medium">{formatCurrency(extra.unit_price_ves)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">Nota: {item.notes}</p>
                    )}
                  </div>
                  <div className="text-right font-medium whitespace-nowrap">
                    {formatCurrency((item.unit_price_ves * item.quantity) + (item.order_item_extras?.reduce((sum, e) => sum + e.unit_price_ves * e.quantity, 0) || 0))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-4 text-sm border-t pt-4">
              <span>Subtotal: {formatCurrency(order.subtotal_ves)}</span>
              <span className="font-medium">Total: {formatCurrency(order.total_ves)}</span>
            </div>
          </CardContent>
        </Card>

        {order.order_status_history && order.order_status_history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5" /> Historial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.order_status_history.map((h, index) => (
                  <div key={h.id} className="flex items-center gap-3 relative">
                    {index < order.order_status_history.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border" />
                    )}
                    <div className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                      <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{STATUS_CONFIG[h.to_status]?.label || h.to_status}</p>
                      <p className="text-sm text-muted-foreground">
                        {h.changed_by_profile?.full_name || 'Sistema'} • {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}