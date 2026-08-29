"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { advanceOrderStatus } from "@/features/orders/actions";
import { getStatusLabel, getStatusColor, getValidTransitions } from "@/features/orders/state-machine";
import { useTransition } from "react";
import { Loader2, Utensils, Truck, CheckCircle, Clock, AlertCircle, ChefHat, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  confirmed: { label: 'Pendientes', icon: Clock, color: 'border-l-yellow-500 bg-yellow-50', empty: 'No hay órdenes pendientes' },
  in_kitchen: { label: 'En Cocina', icon: ChefHat, color: 'border-l-orange-500 bg-orange-50', empty: 'Nada en preparación' },
  ready: { label: 'Listas', icon: CheckCircle, color: 'border-l-green-500 bg-green-50', empty: 'Nada listo para servir/entregar' },
};

const STATUS_ORDER = ['confirmed', 'in_kitchen', 'ready'];

export function KitchenKanban({ orders }) {
  const [isPending, startTransition] = useTransition();
  const [pendingOrderId, setPendingOrderId] = useState(null);

  const ordersByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = orders.filter(o => o.status === status);
    return acc;
  }, {});

  const handleStatusChange = async (orderId, newStatus) => {
    setPendingOrderId(orderId);
    startTransition(async () => {
      const result = await advanceOrderStatus(orderId, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Orden #${orderId.slice(0,8)}: ${result.success}`);
      }
      setPendingOrderId(null);
    });
  };

  const getNextStatus = (currentStatus) => {
    const transitions = getValidTransitions(currentStatus);
    return transitions[0];
  };

  const getItemCount = (order) => {
    return order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return format(date, 'dd/MM HH:mm', { locale: es });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3 h-[calc(100vh-280px)] overflow-y-auto">
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status];
        const statusOrders = ordersByStatus[status] || [];
        const Icon = config.icon;
        const nextStatus = getNextStatus(status);

        return (
          <div key={status} className={cn("flex flex-col h-full", config.color, "rounded-lg border")}>
            <CardHeader className="pb-2 bg-transparent border-none">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5" />
                  {config.label}
                  <Badge variant="secondary" className="ml-2">{statusOrders.length}</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 space-y-3 p-3">
              {statusOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>{config.empty}</p>
                </div>
              ) : (
                statusOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">#{order.order_number}</span>
                        <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(order.created_at)}</span>
                    </div>

                    <div className="mb-2 text-sm">
                      <p className="font-medium">{order.profile?.full_name || order.guest_customer?.full_name || 'Cliente'}</p>
                      {order.table && (
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <Package className="h-3.5 w-3.5" />
                          Mesa: {order.table.name}
                        </p>
                      )}
                      {order.fulfillment_type === 'delivery' && (
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <Truck className="h-3.5 w-3.5" />
                          Delivery
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="text-sm flex items-center gap-2">
                          <span className="font-medium">{item.quantity}x</span>
                          <span className="truncate">{item.product?.name || item.combo?.name}</span>
                          {item.order_item_extras && item.order_item_extras.length > 0 && (
                            <span className="text-muted-foreground text-xs">
                              +{item.order_item_extras.map(e => e.extra?.name).join(', ')}
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-muted-foreground italic text-xs">({item.notes})</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      {nextStatus && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleStatusChange(order.id, nextStatus)}
                          disabled={isPending && pendingOrderId === order.id}
                        >
                          {isPending && pendingOrderId === order.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              {nextStatus === 'in_kitchen' && <ChefHat className="mr-2 h-4 w-4" />}
                              {nextStatus === 'ready' && <CheckCircle className="mr-2 h-4 w-4" />}
                              {nextStatus === 'out_for_delivery' && <Truck className="mr-2 h-4 w-4" />}
                              {nextStatus === 'served' && <Utensils className="mr-2 h-4 w-4" />}
                            </>
                          )}
                          {nextStatus === 'in_kitchen' && 'Iniciar'}
                          {nextStatus === 'ready' && 'Marcar Lista'}
                          {nextStatus === 'out_for_delivery' && 'Para Delivery'}
                          {nextStatus === 'served' && 'Servir'}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => handleStatusChange(order.id, 'cancelled')}
                        disabled={isPending && pendingOrderId === order.id}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>
        );
      })}
    </div>
  );
}

import { useState } from "react";