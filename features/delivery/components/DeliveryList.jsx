"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assignDeliveryDriver, completeDelivery } from "@/features/orders/actions";
import { getStatusLabel, getStatusColor } from "@/features/orders/state-machine";
import { useTransition } from "react";
import { Loader2, Truck, MapPin, User, CheckCircle, AlertCircle, Clock, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  ready: { label: 'Listas para tomar', color: 'border-l-green-500 bg-green-50', icon: Package, empty: 'No hay entregas pendientes' },
  out_for_delivery: { label: 'En Reparto', color: 'border-l-blue-500 bg-blue-50', icon: Truck, empty: 'Ninguna entrega en curso' },
};

const STATUS_ORDER = ['ready', 'out_for_delivery'];

export function DeliveryList({ orders, onRefresh }) {
  const [isPending, startTransition] = useTransition();
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const { toastSuccess, toastError } = useToast();

  const ordersByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = orders.filter(o => o.status === status);
    return acc;
  }, {});

const handleTakeDelivery = async (orderId) => {
    setPendingOrderId(orderId);
    startTransition(async () => {
      const result = await assignDeliveryDriver(orderId);
      if (result.error) {
        toastError(result.error);
      } else {
        toastSuccess("Entrega asignada correctamente");
        onRefresh();
      }
      setPendingOrderId(null);
    });
  };

const handleCompleteDelivery = async (orderId) => {
    setPendingOrderId(orderId);
    startTransition(async () => {
      const result = await completeDelivery(orderId);
      if (result.error) {
        toastError(result.error);
      } else {
        toastSuccess("Entrega completada");
        onRefresh();
      }
      setPendingOrderId(null);
    });
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

  const getItemSummary = (order) => {
    if (!order.order_items?.length) return 'Sin items';
    return order.order_items.map(item => 
      `${item.quantity}x ${item.product?.name || item.combo?.name}`
    ).join(', ');
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 h-[calc(100vh-280px)] overflow-y-auto">
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status];
        const statusOrders = ordersByStatus[status] || [];
        const Icon = config.icon;

        return (
          <div key={status} className={cn("flex flex-col h-full", config.color, "rounded-lg border")}>
            <CardHeader className="pb-2 bg-transparent border-none">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-5 w-5" />
                {config.label}
                <Badge variant="secondary" className="ml-2">{statusOrders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 space-y-3 p-3">
              {statusOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>{config.empty}</p>
                </div>
              ) : (
                statusOrders.map((order) => (
                  <Card key={order.id} className="p-3 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">#{order.order_number}</span>
                        <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(order.created_at)}</span>
                    </div>

                    <div className="mb-2 text-sm space-y-1">
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {order.profile?.full_name || order.guest_customer?.full_name || 'Cliente'}
                      </p>
                      {order.guest_customer?.phone && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {order.guest_customer.phone}
                        </p>
                      )}
                      <p className="text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {order.guest_customer?.address || order.delivery_address || 'Sin dirección'}
                      </p>
                    </div>

                    <div className="mb-3 text-sm text-muted-foreground">
                      <p>{getItemSummary(order)}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      {status === 'ready' && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleTakeDelivery(order.id)}
                          disabled={isPending && pendingOrderId === order.id}
                        >
                          {isPending && pendingOrderId === order.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Truck className="mr-2 h-4 w-4" />
                          )}
                          Tomar Entrega
                        </Button>
                      )}

                      {status === 'out_for_delivery' && (
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleCompleteDelivery(order.id)}
                          disabled={isPending && pendingOrderId === order.id}
                        >
                          {isPending && pendingOrderId === order.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Marcar Entregado
                        </Button>
                      )}
                    </div>
                  </Card>
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