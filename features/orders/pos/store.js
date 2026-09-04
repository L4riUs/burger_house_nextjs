import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getLocalValue, setLocalValue, removeLocalValue } from "@/lib/storage";

const POS_STORAGE_KEY = "burger-house-pos";

const posStorage = createJSONStorage(() => ({
  getItem: (name) => {
    const value = getLocalValue(name);
    return value !== null ? JSON.stringify(value) : null;
  },
  setItem: (name, value) => {
    setLocalValue(name, JSON.parse(value));
  },
  removeItem: (name) => {
    removeLocalValue(name);
  },
}));

export function createPosOrderItem(product, quantity = 1, extras = []) {
  return {
    id: `${product.id}-${Date.now()}`,
    type: "product",
    product: { ...product },
    quantity,
    extras: extras.map((ex) => ({
      ...ex,
      id: ex.id || ex.extra?.id || Date.now().toString(),
    })),
  };
}

export function createPosComboItem(combo, quantity = 1) {
  return {
    id: `${combo.id}-${Date.now()}`,
    type: "combo",
    combo: { ...combo },
    quantity,
  };
}

export function calculatePosItemTotal(item) {
  if (item.type === "combo") {
    const price = item.combo.price_ves || 0;
    return price * item.quantity;
  }

  const productPrice = item.product.price_ves || 0;
  const baseTotal = productPrice * item.quantity;

  const extrasTotal = (item.extras || []).reduce((sum, extra) => {
    const extraPrice = extra.price_ves || extra.extra?.price_ves || 0;
    const extraQty = extra.quantity || 1;
    return sum + extraPrice * extraQty * item.quantity;
  }, 0);

  return baseTotal + extrasTotal;
}

export function calculatePosItemTotalUSD(item) {
  if (item.type === "combo") {
    const price = item.combo.price_usd || 0;
    return price * item.quantity;
  }

  const productPrice = item.product.price_usd || 0;
  const baseTotal = productPrice * item.quantity;

  const extrasTotal = (item.extras || []).reduce((sum, extra) => {
    const extraPrice = extra.price_usd || extra.extra?.price_usd || 0;
    const extraQty = extra.quantity || 1;
    return sum + extraPrice * extraQty * item.quantity;
  }, 0);

  return baseTotal + extrasTotal;
}

export const usePosStore = create(
  persist(
    (set, get) => ({
      items: [],
      channel: 'pos',
      // 'anonymous' = pedido mostrador sin datos de cliente (genera guest genérico)
      customerType: 'anonymous',
      customer: null,
      paymentMethodId: null,
      // Comprobante de pago (métodos que NO son efectivo)
      paymentProof: null,
      paymentProofReceiptPath: null,
      notes: '',
      tableId: null,
      deliveryAddress: '',
      fulfillmentType: 'pickup',

      addProduct: (product, quantity = 1, extras = []) => {
        const existingItem = get().items.find(
          (item) =>
            item.type === "product" &&
            item.product.id === product.id &&
            JSON.stringify(item.extras.map(e => ({ id: e.extra?.id || e.id, quantity: e.quantity })).sort()) ===
            JSON.stringify(extras.map(e => ({ id: e.extra?.id || e.id, quantity: e.quantity })).sort())
        );

        if (existingItem) {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          }));
        } else {
          const newItem = createPosOrderItem(product, quantity, extras);
          set((state) => ({
            items: [...state.items, newItem],
          }));
        }
      },

      addCombo: (combo, quantity = 1) => {
        const existingItem = get().items.find(
          (item) => item.type === "combo" && item.combo.id === combo.id
        );

        if (existingItem) {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          }));
        } else {
          const newItem = createPosComboItem(combo, quantity);
          set((state) => ({
            items: [...state.items, newItem],
          }));
        }
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      updateExtras: (itemId, extras) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? { ...item, extras: extras.map((ex) => ({ ...ex, id: ex.id || ex.extra?.id || Date.now().toString() })) }
              : item
          ),
        }));
      },

      setChannel: (channel) => set({ channel }),
      setCustomerType: (type) => set({ customerType: type }),
      setCustomer: (customer) => set({ customer }),
      setPaymentMethod: (id) => set({ paymentMethodId: id, paymentProof: null, paymentProofReceiptPath: null }),
      setPaymentProof: (proof) => set({ paymentProof: proof }),
      setPaymentProofReceiptPath: (path) => set({ paymentProofReceiptPath: path }),
      setNotes: (notes) => set({ notes }),
      setTableId: (id) => set({ tableId: id }),
      setDeliveryAddress: (address) => set({ deliveryAddress: address }),
      setFulfillmentType: (type) => set({ fulfillmentType: type }),

      clearOrder: () => set({
        items: [],
        customerType: 'anonymous',
        customer: null,
        paymentMethodId: null,
        paymentProof: null,
        paymentProofReceiptPath: null,
        notes: '',
        tableId: null,
        deliveryAddress: '',
        fulfillmentType: 'pickup',
      }),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      getSubtotalVES: () =>
        get().items.reduce((sum, item) => sum + calculatePosItemTotal(item), 0),

      getSubtotalUSD: () =>
        get().items.reduce(
          (sum, item) => sum + calculatePosItemTotalUSD(item),
          0
        ),

      getOrderData: () => {
        const state = get();
        const cartItems = state.items.map(item => {
          if (item.type === 'combo') {
            return {
              type: 'combo',
              combo_id: item.combo.id,
              quantity: item.quantity,
            };
          }
          return {
            type: 'product',
            product_id: item.product.id,
            quantity: item.quantity,
            extras: item.extras.map(ex => ({
              extra_id: ex.extra?.id || ex.id,
              quantity: ex.quantity,
            })),
          };
        });

        // Determinar guest_customer según tipo:
        // 'anonymous' → guest genérico 'Cliente mostrador' (reutilizable, sin duplicar)
        // 'guest'     → datos capturados por el cajero, o un guest existente reutilizado
        // 'authenticated' → profile_id, sin guest
        let resolvedCustomerType = 'guest';
        let resolvedProfileId = null;
        let resolvedGuestCustomer = null;
        let resolvedGuestCustomerId = null;

        if (state.customerType === 'authenticated') {
          resolvedCustomerType = 'authenticated';
          resolvedProfileId = state.customer?.id || null;
        } else if (state.customerType === 'anonymous') {
          resolvedCustomerType = 'guest';
          resolvedGuestCustomer = { full_name: 'Cliente mostrador', phone: '-' };
        } else {
          // 'guest' con datos capturados, o un guest existente reutilizable
          resolvedCustomerType = 'guest';
          if (state.customer?.id) {
            // Guest existente seleccionado del buscador de clientes → reutilizar su id
            resolvedGuestCustomerId = state.customer.id;
            resolvedGuestCustomer = {
              full_name: state.customer.full_name,
              phone: state.customer.phone,
              address: state.customer.address || null,
            };
          } else {
            resolvedGuestCustomer = state.customer || { full_name: 'Cliente mostrador', phone: '-' };
          }
        }

        return {
          fulfillment_type: state.fulfillmentType
            || (state.deliveryAddress ? 'delivery' : state.tableId ? 'dine_in' : 'pickup'),
          table_id: state.tableId,
          delivery_address: state.deliveryAddress,
          currency: 'VES',
          exchange_rate: 1,
          cart_items: cartItems,
          customer_type: resolvedCustomerType,
          profile_id: resolvedProfileId,
          guest_customer: resolvedGuestCustomer,
          guest_customer_id: resolvedGuestCustomerId,
          payment_method_id: state.paymentMethodId,
          payment_proof: state.paymentProof
            ? { ...state.paymentProof, receipt_path: state.paymentProofReceiptPath }
            : null,
          channel: state.channel,
          notes: state.notes,
        };
      },
    }),
    {
      name: POS_STORAGE_KEY,
      storage: posStorage,
    }
  )
);