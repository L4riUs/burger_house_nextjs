"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontalIcon, Eye } from "lucide-react";
import { getStatusLabel, getStatusColor } from "../state-machine";
import { OrderStatusActions } from "./OrderStatusActions";
import { OrderDetailDialog } from "./OrderDetailDialog";
import { useState } from "react";

export function OrderTable({ orders, onRefresh }) {
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
    <>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Opciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    #{order.order_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{getCustomerName(order)}</div>
                    {getCustomerPhone(order) && (
                      <div className="text-sm text-muted-foreground">{getCustomerPhone(order)}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getFulfillmentLabel(order.fulfillment_type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getChannelLabel(order.channel)}</Badge>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {formatCurrency(order.total_ves)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                      <Eye className="mr-1 h-4 w-4" />
                      Ver detalle
                    </Button>
                  </TableCell>
                  <TableCell>
                    <OrderStatusActions
                      order={order}
                      onRefresh={onRefresh}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <MoreHorizontalIcon className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}