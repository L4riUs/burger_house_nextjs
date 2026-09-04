"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, MapPin, Truck, Utensils, Package, User, CreditCard, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStatusLabel, getStatusColor } from "../state-machine";

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

const getPaymentMethodLabel = (method) => {
  if (!method) return 'No especificado';
  return method.name;
};

export function OrderDetailDialog({ order, onClose }) {
  if (!order) return null;

  const items = order.order_items || [];
  const history = order.order_status_history || [];

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="border-b p-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-mono">Orden #{order.order_number}</DialogTitle>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <Badge className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
                <span>•</span>
                <span>{getFulfillmentLabel(order.fulfillment_type)}</span>
                <span>•</span>
                <span>{getChannelLabel(order.channel)}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-160px)] p-4 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" /> Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="font-medium">{getCustomerName(order)}</p>
                {getCustomerPhone(order) && <p className="text-sm text-muted-foreground">{getCustomerPhone(order)}</p>}
                {order.guest_customer?.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {order.guest_customer.address}
                  </p>
                )}
                {order.profile?.avatar_url && (
                  <img src={order.profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p>{getPaymentMethodLabel(order.payment_method)}</p>
                <p className="text-sm text-muted-foreground">
                  Moneda: {order.currency} | Tasa: {order.exchange_rate}
                </p>
                <p className="font-medium">{formatCurrency(order.total_ves)}</p>
              </CardContent>
            </Card>

            {order.table && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Mesa
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="font-medium">{order.table.name}</p>
                  <p className="text-sm text-muted-foreground">Capacidad: {order.table.capacity}</p>
                </CardContent>
              </Card>
            )}

            {order.delivery_address && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Dirección
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p>{order.delivery_address}</p>
                </CardContent>
              </Card>
            )}

            {order.taken_by && order.taken_by !== order.profile?.id && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Tomado por
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p>{order.taken_by_profile?.full_name || 'Staff'}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {items.map((item, index) => (
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
              <div className="mt-4 flex justify-end gap-4 text-sm">
                <span>Subtotal: {formatCurrency(order.subtotal_ves)}</span>
                <span className="font-medium">Total: {formatCurrency(order.total_ves)}</span>
              </div>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Historial de estados
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {history.map((h, index) => (
                    <div key={h.id} className="flex items-center gap-3 relative">
                      {index < history.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border" />
                      )}
                      <div className={cn(
                        "relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                        index === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {index === 0 ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{getStatusLabel(h.to_status)}</p>
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

          {order.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Notas</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </ScrollArea>

        <div className="border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { cn } from "@/lib/utils";