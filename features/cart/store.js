import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getLocalValue, setLocalValue, removeLocalValue } from "@/lib/storage";

const CART_STORAGE_KEY = "burger-house-cart";

const cartStorage = createJSONStorage(() => ({
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

export function createCartItem(product, quantity = 1, extras = []) {
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

export function createCartCombo(combo, quantity = 1) {
  return {
    id: `${combo.id}-${Date.now()}`,
    type: "combo",
    combo: { ...combo },
    quantity,
  };
}

export function getExtrasSignature(extras = []) {
  return JSON.stringify(
    extras
      .map((ex) => ({
        id: ex.extra?.id || ex.id || null,
        quantity: ex.quantity || 1,
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
  );
}

export function calculateItemTotal(item) {
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

export function calculateItemTotalUSD(item) {
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

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addProduct: (product, quantity = 1, extras = []) => {
        const incomingSignature = getExtrasSignature(extras);
        const existingItem = get().items.find(
          (item) =>
            item.type === "product" &&
            item.product.id === product.id &&
            getExtrasSignature(item.extras) === incomingSignature
        );

        if (existingItem) {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === existingItem.id
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                  }
                : item
            ),
          }));
        } else {
          const newItem = createCartItem(product, quantity, extras);
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
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                  }
                : item
            ),
          }));
        } else {
          const newItem = createCartCombo(combo, quantity);
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
              ? {
                  ...item,
                  extras: extras.map((ex) => ({
                    ...ex,
                    id: ex.id || ex.extra?.id || Date.now().toString(),
                  })),
                }
              : item
          ),
        }));
      },

      removeExtraFromItem: (itemId, extraId) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  extras: item.extras.filter((ex) => ex.id !== extraId),
                }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getCartItems: () => get().items,

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      getSubtotalVES: () =>
        get().items.reduce((sum, item) => sum + calculateItemTotal(item), 0),

      getSubtotalUSD: () =>
        get().items.reduce(
          (sum, item) => sum + calculateItemTotalUSD(item),
          0
        ),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: cartStorage,
    }
  )
);
