"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, Eye, MapPin, Truck, Utensils, Package } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getStatusLabel, getStatusColor, getValidTransitions } from "../state-machine";
import { OrderStatusActions } from "./OrderStatusActions";
import { OrderDetailDialog } from "./OrderDetailDialog";
import { useState } from "react";

export function OrderCards({ orders, onRefresh }) {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getCustomerName = (order) => {
    if (order.profile) return order.profile.full_name;
    if (order.guest_customer) return order.guest_customer.full_name;
    return 'Cliente desconocido';
  };

  const getCustomerPhone = (order) => {
    if (order.profile) return order.profile.phone;
    if (order.guest_customer) return order.guest_customer.phone;
    return '';
  };

  const getChannelLabel = (channel) => {
    const labels = {
      storefront: 'Tienda Online',
      pos: 'Mostrador (POS)',
      phone: 'Teléfono/WhatsApp',
    };
    return labels[channel] || channel;
  };

  const getFulfillmentIcon = (type) => {
    switch (type) {
      case 'dine_in': return <Utensils className="h-4 w-4" />;
      case 'pickup': return <Package className="h-4 w-4" />;
      case 'delivery': return <Truck className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getFulfillmentLabel = (type) => {
    const labels = {
      dine_in: 'Comer en local',
      pickup: 'Recoger',
      delivery: 'Delivery',
    };
    return labels[type] || type;
  };

  const getItemCount = (order) => {
    return order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  };

  if (!orders.length) {
    return (
      <div className="text-center py-12 col-span-full">
        <p className="text-muted-foreground">No se encontraron órdenes</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {orders.map((order) => (
        <Card key={order.id} className="transition-shadow hover:shadow-lg cursor-pointer" onClick={() => setSelectedOrder(order)}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg font-mono">#{order.order_number}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  {getFulfillmentIcon(order.fulfillment_type)}
                  <span>{getFulfillmentLabel(order.fulfillment_type)}</span>
                  <span>·</span>
                  <Badge variant="outline" className="text-xs">{getChannelLabel(order.channel)}</Badge>
                </div>
              </div>
              <Badge className={getStatusColor(order.status)}>
                {getStatusLabel(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{getCustomerName(order)}</span>
                {getCustomerPhone(order) && <span className="text-muted-foreground">{getCustomerPhone(order)}</span>}
              </div>
              <div className="text-right">
                <div className="font-medium tabular-nums">{formatCurrency(order.total_ves)}</div>
                <div className="text-xs text-muted-foreground">{getItemCount(order)} items</div>
              </div>
            </div>

            {order.table && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>Mesa: {order.table.name}</span>
              </div>
            )}

            {order.delivery_address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{order.delivery_address}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
              <span>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 p-0" />}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Más opciones</span>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); setSelectedOrder(order); }}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </DropdownMenuItem>
                  <OrderStatusActions order={order} onRefresh={onRefresh} />
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}