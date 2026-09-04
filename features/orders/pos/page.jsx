"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePosStore } from "./store";
import { PosOrderBuilder } from "./components/PosOrderBuilder";
import { PosCustomerSelector } from "./components/PosCustomerSelector";
import { PosChannelSelector } from "./components/PosChannelSelector";
import { PosPaymentVerification } from "./components/PosPaymentVerification";
import { requiresPaymentProof, isPaymentProofComplete } from "../payment-verification";
import { POS_PAYMENT_VERIFICATION } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { getLocalizedField } from "@/lib/i18n";
import { createOrder } from "@/features/orders/actions";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { addOfflineOrder, getPendingSyncCount, getPendingSyncOrders, markOrderSynced, markOrderConflict } from "@/lib/offline-queue";
import { Loader2, CreditCard, User, Package, Truck, Utensils, Sandwich, Search, Check, WifiOff, RotateCcw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTransition } from "react";

const FULFILLMENT_TYPES = [
  { value: 'pickup', label: 'Recoger', icon: Package },
  { value: 'dine_in', label: 'Comer aquí', icon: Utensils },
  { value: 'delivery', label: 'Delivery', icon: Truck },
];



function CatalogCard({ item, type, onAdd }) {
  const title = item.name?.es || item.name;
  const soldOut = item.is_sold_out;
  const comboItems = item.combo_items || [];

  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      disabled={soldOut}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {type === 'combo' ? (
              <Package className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Sandwich className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}
        {soldOut && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            Agotado
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <span className="font-medium text-sm leading-tight line-clamp-2">{title}</span>
        <span className="font-semibold tabular-nums text-primary">{formatCurrency(item.price_ves)}</span>
        {type === 'combo' && comboItems.length > 0 && (
          <ul className="mt-1 flex flex-col gap-0.5">
            {comboItems.slice(0, 4).map((ci) => (
              <li key={ci.id} className="text-xs text-muted-foreground leading-tight">
                {ci.quantity}x {ci.product?.name?.es || ci.product?.name}
              </li>
            ))}
            {comboItems.length > 4 && (
              <li className="text-xs text-muted-foreground leading-tight">...</li>
            )}
          </ul>
        )}
      </div>
    </button>
  );
}

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
    fulfillmentType,
    addProduct,
    addCombo,
    removeItem,
    updateQuantity,
    updateExtras,
    setChannel,
    setCustomerType,
    setCustomer,
    setPaymentMethod,
    paymentProof,
    paymentProofReceiptPath,
    setNotes,
    setTableId,
    setDeliveryAddress,
    setFulfillmentType,
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

  const { toastSuccess, toastError } = useToast();

  const categoryItems = [
    { value: 'all', label: 'Todas las categorías' },
    ...categories.map((c) => ({ value: c.id, label: c.name?.es || c.name })),
  ];

  const tableItems = tables.map((t) => ({
    value: t.id,
    label: `${t.name} (Cap: ${t.capacity})`,
  }));

  const paymentItems = paymentMethods.map((pm) => ({
    value: pm.id,
    label: `${pm.name} (${pm.currency})`,
  }));

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
        supabase.from('payment_methods').select('id, name, currency, provider_code').eq('is_active', true).is('deleted_at', null).order('name'),
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

  // Agrega el producto directamente
  const handleProductClick = (product) => {
    addProduct(product, 1, []);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toastError("Agrega al menos un item a la orden");
      return;
    }

    // 'anonymous' no requiere datos de cliente (se usa guest genérico)
    if (customerType !== 'anonymous') {
      if (customerType === 'guest' && (!customer?.full_name?.trim() || !customer?.phone?.trim())) {
        toastError("Ingresa nombre y teléfono del cliente invitado");
        return;
      }
      if (customerType === 'authenticated' && !customer) {
        toastError("Selecciona un cliente registrado");
        return;
      }
    }

    if (fulfillmentType === 'dine_in' && !tableId) {
      toastError("Selecciona una mesa para consumo en local");
      return;
    }

    if (fulfillmentType === 'delivery' && !deliveryAddress) {
      toastError("Ingresa la dirección para delivery");
      return;
    }

    if (!paymentMethodId) {
      toastError("Selecciona un método de pago");
      return;
    }

    // Verificación de pago: solo para métodos que NO son efectivo.
    const selectedPaymentMethod = paymentMethods.find((pm) => pm.id === paymentMethodId);
    if (requiresPaymentProof(selectedPaymentMethod)) {
      const proofComplete =
        isPaymentProofComplete({
          provider_code: selectedPaymentMethod?.provider_code,
          reference_number: paymentProof?.reference_number,
          payer_phone: paymentProof?.payer_phone,
          payer_id_number: paymentProof?.payer_id_number,
        }) && !!paymentProofReceiptPath;

      if (POS_PAYMENT_VERIFICATION === 'before' && !proofComplete) {
        toastError(
          "Es necesario capturar el comprobante de pago (referencia y foto) para métodos que no son efectivo"
        );
        return;
      }
    }

    const builtOrderData = getOrderData();
    const orderData = POS_PAYMENT_VERIFICATION === 'after'
      ? { ...builtOrderData, payment_proof: null }
      : builtOrderData;

    if (isOnline) {
      startTransition(async () => {
        const result = await createOrder(orderData);
        if (result.error) {
          console.error("[POS] Error al crear orden:", result.error);
          toastError(result.error);
        } else {
          toastSuccess("Orden creada: #" + result.data?.order_number);
          clearOrder();
        }
      });
    } else {
      const payload = {
        ...orderData,
        client_ref: crypto.randomUUID(),
      };
      await addOfflineOrder(payload);
      toastSuccess("Pedido guardado offline, se sincronizará al reconectar");
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
      toastSuccess(`${synced} pedido(s) sincronizado(s)`);
    }
    if (conflicts > 0) {
      toastError(`${conflicts} pedido(s) con conflicto, revisar en cola offline`);
    }
    updatePendingCount();
  };

  const handleManualSync = async () => {
    const online = await checkConnectivity();
    if (!online) {
      toastError("Sin conexión, no se puede sincronizar");
      return;
    }
    await handleAutoSync();
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
              <CardTitle>Productos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar productos o combos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={selectedCategory || 'all'}
                  onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}
                  items={categoryItems}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name?.es || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-xs">
                  <TabsTrigger value="products">Productos ({filteredProducts.length})</TabsTrigger>
                  <TabsTrigger value="combos">Combos ({combos.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="products" className="mt-4">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron productos
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                      {filteredProducts.map((product) => (
                        <CatalogCard
                          key={product.id}
                          item={product}
                          type="product"
                          onAdd={handleProductClick}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="combos" className="mt-4">
                  {combos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron combos
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                      {combos.map((combo) => (
                        <CatalogCard
                          key={combo.id}
                          item={combo}
                          type="combo"
                          onAdd={addCombo}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
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
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {FULFILLMENT_TYPES.map((type) => {
                  const disabled = type.value === 'dine_in' && tables.length === 0;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setFulfillmentType(type.value);
                        if (type.value === 'dine_in') {
                          setDeliveryAddress('');
                          if (!tableId && tables.length > 0) setTableId(tables[0].id);
                        } else if (type.value === 'delivery') {
                          setTableId(null);
                        } else {
                          setTableId(null);
                          setDeliveryAddress('');
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        fulfillmentType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <type.icon className="h-5 w-5" />
                      <span className="font-medium">{type.label}</span>
                      {fulfillmentType === type.value && (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {fulfillmentType === 'dine_in' &&
                (tables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay mesas disponibles.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Mesa</span>
                    <Select
                      value={tableId}
                      onValueChange={setTableId}
                      items={tableItems}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar mesa" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} (Cap: {t.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

              {fulfillmentType === 'delivery' && (
                <textarea
                  placeholder="Dirección de entrega"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  rows={2}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <PosChannelSelector onChange={setChannel} value={channel} />
              <Separator />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Método de pago</span>
                <Select
                  value={paymentMethodId}
                  onValueChange={setPaymentMethod}
                  items={paymentItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.name} ({pm.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <PosPaymentVerification />
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