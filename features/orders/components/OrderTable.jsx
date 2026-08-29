"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getStatusLabel, getStatusColor, getValidTransitions } from "../state-machine";
import { OrderStatusActions } from "./OrderStatusActions";
import { OrderDetailDialog } from "./OrderDetailDialog";
import { useState } from "react";

export function OrderTable({ orders }) {
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

  const getFulfillmentLabel = (type) => {
    const labels = {
      dine_in: 'Comer en local',
      pickup: 'Recoger',
      delivery: 'Delivery',
    };
    return labels[type] || type;
  };

  if (!orders.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se encontraron órdenes</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Orden</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cliente</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Canal</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Total</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fecha</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {orders.map((order) => (
              <tr key={order.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer" onClick={() => setSelectedOrder(order)}>
                <td className="p-4 align-middle font-mono text-sm">
                  #{order.order_number}
                </td>
                <td className="p-4 align-middle">
                  <div className="font-medium">{getCustomerName(order)}</div>
                  {getCustomerPhone(order) && (
                    <div className="text-sm text-muted-foreground">{getCustomerPhone(order)}</div>
                  )}
                </td>
                <td className="p-4 align-middle">
                  <Badge variant="secondary">{getFulfillmentLabel(order.fulfillment_type)}</Badge>
                </td>
                <td className="p-4 align-middle">
                  <Badge variant="outline">{getChannelLabel(order.channel)}</Badge>
                </td>
                <td className="p-4 align-middle font-medium tabular-nums">
                  {formatCurrency(order.total_ves)}
                </td>
                <td className="p-4 align-middle">
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </td>
                <td className="p-4 align-middle text-sm text-muted-foreground">
                  {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                </td>
                <td className="p-4 align-middle text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Más opciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild onClick={(e) => { e.preventDefault(); setSelectedOrder(order); }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalle
                      </DropdownMenuItem>
                      <OrderStatusActions order={order} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}