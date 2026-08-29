"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle, RotateCcw, Trash2, Eye, Wifi, WifiOff, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getAllOfflineOrders, getPendingSyncOrders, getConflictOrders, markOrderSynced, markOrderConflict, deleteOfflineOrder } from "@/lib/offline-queue";
import { createOrder } from "@/features/orders/actions";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending_sync: { label: 'Pendiente de sincronizar', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  synced: { label: 'Sincronizado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  conflict: { label: 'Conflicto', color: 'bg-red-100 text-red-800', icon: XCircle },
};

function getFulfillmentLabel(type) {
  const labels = {
    dine_in: 'Comer en local',
    pickup: 'Recoger',
    delivery: 'Delivery',
  };
  return labels[type] || type;
}

function getCustomerName(payload) {
  if (payload.customer_type === 'authenticated') {
    return 'Cliente autenticado';
  }
  return payload.guest_customer?.full_name || 'Cliente invitado';
}

function getItemSummary(payload) {
  if (!payload.cart_items?.length) return 'Sin items';
  return payload.cart_items.map(item => {
    if (item.type === 'combo') {
      return `${item.quantity}x Combo`;
    }
    return `${item.quantity}x Producto${item.extras?.length ? ` (+${item.extras.length} extras)` : ''}`;
  }).join(', ');
}

export default function OfflineQueuePage() {
  const { isOnline } = useOnlineStatus();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending_sync');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, orderId: null });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const allOrders = await getAllOfflineOrders();
      setOrders(allOrders);
    } catch (err) {
      toast.error("Error cargando pedidos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRetry = async (order) => {
    setSyncing(true);
    try {
      const result = await createOrder(order.payload);
      if (result.error) {
        await markOrderConflict(order.id, result.error);
        toast.error("Conflicto al sincronizar: " + result.error);
      } else {
        await markOrderSynced(order.id);
        toast.success("Pedido sincronizado: #" + result.data?.order_number);
      }
    } catch (err) {
      await markOrderConflict(order.id, err.message);
      toast.error("Error al sincronizar: " + err.message);
    } finally {
      fetchOrders();
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.orderId) {
      await deleteOfflineOrder(deleteConfirm.orderId);
      toast.success("Pedido descartado");
      fetchOrders();
      setDeleteConfirm({ open: false, orderId: null });
    }
  };

  const handleSyncAll = async () => {
    const pendingOrders = orders.filter(o => o.status === 'pending_sync');
    if (pendingOrders.length === 0) return;

    setSyncing(true);
    let synced = 0;
    let conflicts = 0;

    for (const order of pendingOrders) {
      try {
        const result = await createOrder(order.payload);
        if (result.error) {
          await markOrderConflict(order.id, result.error);
          conflicts++;
        } else {
          await markOrderSynced(order.id);
          synced++;
        }
      } catch (err) {
        await markOrderConflict(order.id, err.message);
        conflicts++;
      }
    }

    if (synced > 0) toast.success(`${synced} pedido(s) sincronizado(s)`);
    if (conflicts > 0) toast.error(`${conflicts} pedido(s) con conflicto`);
    fetchOrders();
    setSyncing(false);
  };

  const pendingOrders = orders.filter(o => o.status === 'pending_sync');
  const conflictOrders = orders.filter(o => o.status === 'conflict');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cola Offline</h1>
          <p className="text-muted-foreground">Pedidos tomados sin conexión, pendientes de sincronizar</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? 'default' : 'destructive'} className="flex items-center gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          {pendingOrders.length > 0 && (
            <Button onClick={handleSyncAll} disabled={syncing || !isOnline}>
              {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RotateCcw className="mr-2 h-4 w-4" />
              Sincronizar todos ({pendingOrders.length})
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'pending_sync' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('pending_sync')}
          className="border-b-2 border-primary -mb-px"
        >
          Pendientes ({pendingOrders.length})
        </Button>
        <Button
          variant={activeTab === 'conflict' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('conflict')}
          className="border-b-2 border-destructive -mb-px"
        >
          Conflictos ({conflictOrders.length})
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : (activeTab === 'pending_sync' ? pendingOrders : conflictOrders).length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {activeTab === 'pending_sync'
              ? 'No hay pedidos pendientes de sincronizar'
              : 'No hay pedidos en conflicto'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'pending_sync' ? pendingOrders : conflictOrders).map((order) => (
            <Card key={order.id} className="border-l-4">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_CONFIG[order.status]?.color}>
                      {STATUS_CONFIG[order.status]?.label}
                    </Badge>
                    <div>
                      <p className="font-mono font-bold">Cliente: {getCustomerName(order.payload)}</p>
                      <p className="text-sm text-muted-foreground">
                        {getFulfillmentLabel(order.payload.fulfillment_type)} • {getItemSummary(order.payload)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                    {order.status === 'conflict' && order.last_error && (
                      <Badge variant="destructive" className="text-xs">
                        {order.last_error.substring(0, 50)}...
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    disabled={syncing}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </Button>
                  {order.status === 'pending_sync' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRetry(order)}
                      disabled={syncing || !isOnline}
                    >
                      {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reintentar
                    </Button>
                  )}
                  {order.status === 'conflict' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRetry(order)}
                      disabled={syncing || !isOnline}
                    >
                      {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reintentar tras editar
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirm({ open: true, orderId: order.id })}
                    disabled={syncing}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Descartar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedOrder && (
        <AlertDialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Detalle del pedido offline</AlertDialogTitle>
              <AlertDialogDescription>
                Cliente: {getCustomerName(selectedOrder.payload)} • {getFulfillmentLabel(selectedOrder.payload.fulfillment_type)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <p className="font-medium">Items:</p>
                  <ul className="list-disc list-inside text-muted-foreground mt-1">
                    {selectedOrder.payload.cart_items?.map((item, idx) => (
                      <li key={idx}>
                        {item.type === 'combo' ? 'Combo' : 'Producto'} x{item.quantity}
                        {item.extras?.length && ` (+${item.extras.length} extras)`}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Total: {formatCurrency(selectedOrder.payload.total_ves || 0)}</p>
                  <p className="text-muted-foreground mt-1">
                    Creado: {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                  <p className="text-muted-foreground">
                    Client Ref: {selectedOrder.client_ref}
                  </p>
                  {selectedOrder.last_error && (
                    <p className="text-destructive mt-2 text-xs">
                      Error: {selectedOrder.last_error}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedOrder(null)}>Cerrar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={deleteConfirm.open} onOpenChange={open => !open && setDeleteConfirm({ open: false, orderId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pedido se eliminará permanentemente de la cola offline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}