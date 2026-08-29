"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePosStore } from "./store";
import { PosOrderBuilder } from "./components/PosOrderBuilder";
import { PosCustomerSelector } from "./components/PosCustomerSelector";
import { PosChannelSelector } from "./components/PosChannelSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { createOrder } from "@/features/orders/actions";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { addOfflineOrder, getPendingSyncCount, getPendingSyncOrders, markOrderSynced, markOrderConflict } from "@/lib/offline-queue";
import { Loader2, CreditCard, User, Package, Truck, Utensils, X, Plus, Minus, CheckCircle, WifiOff, Wifi, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTransition } from "react";

const FULFILLMENT_TYPES = [
  { value: 'pickup', label: 'Recoger', icon: Package },
  { value: 'dine_in', label: 'Comer aquí', icon: Utensils },
  { value: 'delivery', label: 'Delivery', icon: Truck },
];

export default function PosPage() {
  const {
    items,
    channel,
    customerType,
    customer,
    paymentMethodId,
    notes,
    tableId,
    deliveryAddress,
    addProduct,
    addCombo,
    removeItem,
    updateQuantity,
    updateExtras,
    setChannel,
    setCustomerType,
    setCustomer,
    setPaymentMethod,
    setNotes,
    setTableId,
    setDeliveryAddress,
    clearOrder,
    getSubtotalVES,
    getItemCount,
    getOrderData,
  } = usePosStore();

  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [isSubmitting, startTransition] = useTransition();
  const { isOnline, wasOffline, checkConnectivity } = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingSyncCount(count);
  }, []);

  useEffect(() => {
    loadData();
    updatePendingCount();
  }, [updatePendingCount]);

  useEffect(() => {
    if (isOnline && wasOffline) {
      handleAutoSync();
    }
  }, [isOnline, wasOffline]);

  const loadData = async () => {
    const supabase = createClient();

    try {
      const [productsRes, combosRes, categoriesRes, paymentsRes, tablesRes] = await Promise.all([
        supabase.from('products').select('id, name, price_ves, price_usd, image_url, is_active, is_sold_out, category_id, product_type').eq('is_active', true).is('deleted_at', null).order('name->>es'),
        supabase.from('combos').select('id, name, price_ves, price_usd, image_url, is_active, combo_items(id, quantity, product:products(id, name, price_ves, price_usd))').eq('is_active', true).is('deleted_at', null).order('name->>es'),
        supabase.from('categories').select('id, name').eq('applies_to', 'product').is('deleted_at', null).order('sort_order'),
        supabase.from('payment_methods').select('id, name, currency').eq('is_active', true).is('deleted_at', null).order('name'),
        supabase.from('restaurant_tables').select('id, name, capacity').eq('status', 'available').is('deleted_at', null).order('name'),
      ]);

      setProducts(productsRes.data || []);
      setCombos(combosRes.data || []);
      setCategories(categoriesRes.data || []);
      setPaymentMethods(paymentsRes.data || []);
      setTables(tablesRes.data || []);
    } catch (err) {
      toast.error("Error cargando datos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (searchQuery && !p.name?.es?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return !p.is_sold_out;
  });

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Agrega al menos un item a la orden");
      return;
    }

    if (channel !== 'storefront' && !customer) {
      toast.error("Selecciona o crea un cliente");
      return;
    }

    if (items.some(item => item.type === 'product' && item.product.fulfillment_type === 'dine_in' && !tableId)) {
      toast.error("Selecciona una mesa para consumo en local");
      return;
    }

    if (items.some(item => item.product.fulfillment_type === 'delivery' && !deliveryAddress)) {
      toast.error("Ingresa la dirección para delivery");
      return;
    }

    const orderData = getOrderData();

    if (isOnline) {
      startTransition(async () => {
        const result = await createOrder(orderData);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Orden creada: #" + result.data?.order_number);
          clearOrder();
        }
      });
    } else {
      const payload = {
        ...orderData,
        client_ref: crypto.randomUUID(),
      };
      await addOfflineOrder(payload);
      toast.success("Pedido guardado offline, se sincronizará al reconectar");
      clearOrder();
      updatePendingCount();
    }
  };

  const handleAutoSync = async () => {
    const pendingOrders = await getPendingSyncOrders();
    if (pendingOrders.length === 0) return;

    let synced = 0;
    let conflicts = 0;

    for (const offlineOrder of pendingOrders) {
      try {
        const result = await createOrder(offlineOrder.payload);
        if (result.error) {
          await markOrderConflict(offlineOrder.id, result.error);
          conflicts++;
        } else {
          await markOrderSynced(offlineOrder.id);
          synced++;
        }
      } catch (err) {
        await markOrderConflict(offlineOrder.id, err.message);
        conflicts++;
      }
    }

    if (synced > 0) {
      toast.success(`${synced} pedido(s) sincronizado(s)`);
    }
    if (conflicts > 0) {
      toast.error(`${conflicts} pedido(s) con conflicto, revisar en cola offline`);
    }
    updatePendingCount();
  };

  const handleManualSync = async () => {
    const online = await checkConnectivity();
    if (!online) {
      toast.error("Sin conexión, no se puede sincronizar");
      return;
    }
    await handleAutoSync();
  };

  const getFulfillmentType = () => {
    if (deliveryAddress) return 'delivery';
    if (tableId) return 'dine_in';
    return 'pickup';
  };

  const subtotal = getSubtotalVES();
  const itemCount = getItemCount();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Nueva Orden (POS)</h1>
          <Badge variant="secondary">{channel === 'pos' ? 'Mostrador' : 'Teléfono'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{itemCount} items</span>
          <span className="text-lg font-bold tabular-nums">{formatCurrency(subtotal)}</span>
          {!isOnline && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          {pendingSyncCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {pendingSyncCount} pendiente
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={!isOnline || isSubmitting}
                title="Sincronizar ahora"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button size="lg" onClick={handleSubmit} disabled={isSubmitting || items.length === 0} className="bg-primary text-primary-foreground">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Orden
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Productos</CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="border rounded-md px-2 py-1 text-sm"
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name?.es || c.name}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border rounded-md px-2 py-1 text-sm w-48"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'products' ? (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className="p-3 border rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <p className="font-medium text-sm">{product.name?.es || product.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(product.price_ves)}</p>
                      {product.is_sold_out && <span className="text-xs text-red-500">Agotado</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {combos.map((combo) => (
                    <button
                      key={combo.id}
                      onClick={() => addCombo(combo)}
                      className="p-3 border rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <p className="font-medium text-sm">{combo.name?.es || combo.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(combo.price_ves)}</p>
                      <p className="text-xs text-muted-foreground">
                        {combo.combo_items?.length || 0} items
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList>
                  <TabsTrigger value="products">Productos ({filteredProducts.length})</TabsTrigger>
                  <TabsTrigger value="combos">Combos ({combos.length})</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Orden Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PosOrderBuilder />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PosCustomerSelector />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Tipo de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {FULFILLMENT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      getFulfillmentType() === type.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      checked={getFulfillmentType() === type.value}
                      onChange={() => {
                        if (type.value === 'dine_in') {
                          setTableId(tables[0]?.id || null);
                          setDeliveryAddress('');
                        } else if (type.value === 'delivery') {
                          setTableId(null);
                        } else {
                          setTableId(null);
                          setDeliveryAddress('');
                        }
                      }}
                      className="sr-only"
                    />
                    <type.icon className="h-5 w-5" />
                    <span className="font-medium">{type.label}</span>
                  </label>
                ))}

                {getFulfillmentType() === 'dine_in' && tables.length > 0 && (
                  <select
                    value={tableId || ''}
                    onChange={(e) => setTableId(e.target.value || null)}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="">Seleccionar mesa</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name} (Cap: {t.capacity})</option>)}
                  </select>
                )}

                {getFulfillmentType() === 'delivery' && (
                  <textarea
                    placeholder="Dirección de entrega"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    rows={2}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PosChannelSelector onChange={setChannel} value={channel} />
              <Separator className="my-3" />
              <select
                value={paymentMethodId || ''}
                onChange={(e) => setPaymentMethod(e.target.value || null)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Método de pago</option>
                {paymentMethods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Notas adicionales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                rows={2}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}