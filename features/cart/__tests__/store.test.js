import { describe, it, expect, beforeEach } from "vitest";
import {
  createCartItem,
  createCartCombo,
  calculateItemTotal,
  calculateItemTotalUSD,
  useCartStore,
} from "../store";

const PRODUCTO_BASE = {
  id: "11111111-1111-1111-1111-111111111111",
  name: { es: "Hamburguesa Clásica", en: "Classic Burger" },
  price_ves: 100,
  price_usd: 5,
};

const EXTRA_QUESO = {
  id: "22222222-2222-2222-2222-222222222222",
  name: { es: "Queso extra", en: "Extra cheese" },
  price_ves: 20,
  price_usd: 1,
};

const EXTRA_TOCINO = {
  id: "33333333-3333-3333-3333-333333333333",
  name: { es: "Tocino", en: "Bacon" },
  price_ves: 30,
  price_usd: 1.5,
};

const COMBO_BASE = {
  id: "44444444-4444-4444-4444-444444444444",
  name: { es: "Combo Familiar", en: "Family Combo" },
  price_ves: 500,
  price_usd: 25,
};

function resetCart() {
  useCartStore.setState({ items: [] });
}

describe("Cart Store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCart();
  });

  describe("createCartItem", () => {
    it("crea un item de tipo producto con cantidad y extras", () => {
      const item = createCartItem(PRODUCTO_BASE, 2, [
        { extra: EXTRA_QUESO, quantity: 1 },
      ]);

      expect(item.type).toBe("product");
      expect(item.product).toEqual(PRODUCTO_BASE);
      expect(item.quantity).toBe(2);
      expect(item.extras).toHaveLength(1);
      expect(item.extras[0].extra).toEqual(EXTRA_QUESO);
      expect(item.extras[0].id).toBeDefined();
    });

    it("usa cantidad 1 por defecto y lista de extras vacía", () => {
      const item = createCartItem(PRODUCTO_BASE);

      expect(item.quantity).toBe(1);
      expect(item.extras).toEqual([]);
    });

    it("asigna id al extra cuando no lo trae", () => {
      const item = createCartItem(PRODUCTO_BASE, 1, [{ extra: EXTRA_QUESO }]);

      expect(item.extras[0].id).toBeTruthy();
    });
  });

  describe("createCartCombo", () => {
    it("crea un item de tipo combo", () => {
      const item = createCartCombo(COMBO_BASE, 3);

      expect(item.type).toBe("combo");
      expect(item.combo).toEqual(COMBO_BASE);
      expect(item.quantity).toBe(3);
    });
  });

  describe("calculateItemTotal", () => {
    it("calcula precio por cantidad para combos", () => {
      const item = createCartCombo(COMBO_BASE, 3);

      expect(calculateItemTotal(item)).toBe(1500);
    });

    it("calcula precio base del producto por cantidad", () => {
      const item = createCartItem(PRODUCTO_BASE, 2);

      expect(calculateItemTotal(item)).toBe(200);
    });

    it("suma el precio de los extras multiplicado por la cantidad del item", () => {
      const item = createCartItem(PRODUCTO_BASE, 2, [
        { extra: EXTRA_QUESO, quantity: 1 },
        { extra: EXTRA_TOCINO, quantity: 2 },
      ]);

      // Base: 100 * 2 = 200
      // Extras: (20 * 1 + 30 * 2) * 2 = 160
      expect(calculateItemTotal(item)).toBe(360);
    });
  });

  describe("calculateItemTotalUSD", () => {
    it("calcula total en USD para productos con extras", () => {
      const item = createCartItem(PRODUCTO_BASE, 2, [
        { extra: EXTRA_QUESO, quantity: 2 },
      ]);

      // Base: 5 * 2 = 10, extras: 1 * 2 * 2 = 4
      expect(calculateItemTotalUSD(item)).toBe(14);
    });

    it("calcula total en USD para combos", () => {
      const item = createCartCombo(COMBO_BASE, 2);

      expect(calculateItemTotalUSD(item)).toBe(50);
    });
  });

  describe("addProduct", () => {
    it("agrega un producto nuevo al carrito", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].product.id).toBe(PRODUCTO_BASE.id);
      expect(items[0].quantity).toBe(1);
    });

    it("fusiona cantidades cuando el mismo producto se agrega sin extras", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1);
      useCartStore.getState().addProduct(PRODUCTO_BASE, 2);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
    });

    it("crea líneas separadas cuando los extras difieren", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1, [
        { extra: EXTRA_QUESO, quantity: 1 },
      ]);
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1, [
        { extra: EXTRA_TOCINO, quantity: 1 },
      ]);

      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it("fusiona cuando el mismo producto se agrega con los mismos extras", () => {
      const extras = [{ extra: EXTRA_QUESO, quantity: 1 }];
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1, extras);
      useCartStore.getState().addProduct(PRODUCTO_BASE, 2, [
        { extra: EXTRA_QUESO, quantity: 1 },
      ]);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
    });

    it("fusiona aunque los extras vengan en otro orden", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1, [
        { extra: EXTRA_QUESO, quantity: 1 },
        { extra: EXTRA_TOCINO, quantity: 2 },
      ]);
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1, [
        { extra: EXTRA_TOCINO, quantity: 2 },
        { extra: EXTRA_QUESO, quantity: 1 },
      ]);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });
  });

  describe("addCombo", () => {
    it("agrega un combo nuevo y fusiona si ya existe", () => {
      useCartStore.getState().addCombo(COMBO_BASE, 1);
      useCartStore.getState().addCombo(COMBO_BASE, 2);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe("combo");
      expect(items[0].quantity).toBe(3);
    });
  });

  describe("updateQuantity", () => {
    it("actualiza la cantidad de un item", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1);
      const itemId = useCartStore.getState().items[0].id;

      useCartStore.getState().updateQuantity(itemId, 5);

      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("elimina el item cuando la cantidad llega a 0", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1);
      const itemId = useCartStore.getState().items[0].id;

      useCartStore.getState().updateQuantity(itemId, 0);

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("removeItem", () => {
    it("elimina el item indicado", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1);
      useCartStore.getState().addCombo(COMBO_BASE, 1);
      const productId = useCartStore.getState().items[0].id;

      useCartStore.getState().removeItem(productId);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe("combo");
    });
  });

  describe("updateExtras y removeExtraFromItem", () => {
    it("reemplaza los extras de un item", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1);
      const itemId = useCartStore.getState().items[0].id;

      useCartStore.getState().updateExtras(itemId, [
        { extra: EXTRA_TOCINO, quantity: 2 },
      ]);

      const item = useCartStore.getState().items[0];
      expect(item.extras).toHaveLength(1);
      expect(item.extras[0].extra.id).toBe(EXTRA_TOCINO.id);
    });

    it("elimina un extra específico del item", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1, [
        { extra: EXTRA_QUESO, quantity: 1 },
        { extra: EXTRA_TOCINO, quantity: 1 },
      ]);
      const itemId = useCartStore.getState().items[0].id;
      const quesoId = useCartStore.getState().items[0].extras.find(
        (ex) => ex.extra.id === EXTRA_QUESO.id
      ).id;

      useCartStore.getState().removeExtraFromItem(itemId, quesoId);

      const extras = useCartStore.getState().items[0].extras;
      expect(extras).toHaveLength(1);
      expect(extras[0].extra.id).toBe(EXTRA_TOCINO.id);
    });
  });

  describe("clearCart", () => {
    it("vacía el carrito", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1);
      useCartStore.getState().clearCart();

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("selectores calculados", () => {
    it("getItemCount suma las cantidades de todos los items", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 2);
      useCartStore.getState().addCombo(COMBO_BASE, 3);

      expect(useCartStore.getState().getItemCount()).toBe(5);
    });

    it("getSubtotalVES suma totales VES de productos y combos", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 2); // 200
      useCartStore.getState().addCombo(COMBO_BASE, 1); // 500

      expect(useCartStore.getState().getSubtotalVES()).toBe(700);
    });

    it("getSubtotalUSD suma totales USD incluyendo extras", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1, [
        { extra: EXTRA_QUESO, quantity: 2 }, // 1 * 2 = 2 USD
      ]); // 5 + 2 = 7 USD
      useCartStore.getState().addCombo(COMBO_BASE, 1); // 25

      expect(useCartStore.getState().getSubtotalUSD()).toBe(32);
    });

    it("retorna 0 en carrito vacío", () => {
      expect(useCartStore.getState().getItemCount()).toBe(0);
      expect(useCartStore.getState().getSubtotalVES()).toBe(0);
      expect(useCartStore.getState().getSubtotalUSD()).toBe(0);
    });
  });

  describe("persistencia", () => {
    it("guarda el carrito en localStorage bajo la clave burger-house-cart", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 2);

      const raw = window.localStorage.getItem("burger-house-cart");
      expect(raw).not.toBeNull();

      const persisted = JSON.parse(raw);
      expect(persisted.state.items).toHaveLength(1);
      expect(persisted.state.items[0].quantity).toBe(2);
    });

    it("refleja el carrito vacío en storage tras clearCart", () => {
      useCartStore.getState().addProduct(PRODUCTO_BASE, 1);
      useCartStore.getState().clearCart();

      const raw = window.localStorage.getItem("burger-house-cart");
      const persisted = JSON.parse(raw);
      expect(persisted.state.items).toHaveLength(0);
    });
  });
});
