"use client";

import { ShoppingBasketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useCartStore } from "@/features/cart/store";
import { getLocalizedField } from "@/lib/i18n";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const getSubtotalVES = useCartStore((state) => state.getSubtotalVES);
  const getItemCount = useCartStore((state) => state.getItemCount);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBasketIcon className="mx-auto h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">Carrito vacío</h2>
        <p className="text-muted-foreground mb-4">
          Aún no has agregado productos a tu carrito.
        </p>
        <Button render={<Link href="/menu" />} nativeButton={false}>
          Ver menú
        </Button>
      </div>
    );
  }

  const subtotalVES = getSubtotalVES();
  const itemCount = getItemCount();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Carrito de compras</h1>

        <div className="space-y-4">
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onRemove={() => removeItem(item.id)}
              onUpdateQty={(qty) => updateQuantity(item.id, qty)}
            />
          ))}
        </div>

        <div className="flex justify-between items-center border-t pt-4 mt-6">
          <div>
            <span className="text-muted-foreground">
              {itemCount} {itemCount === 1 ? "producto" : "productos"}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">${Number(subtotalVES).toFixed(2)} VES</p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 gap-3">
          <Button variant="outline" onClick={clearCart}>
            Vaciar carrito
          </Button>
          <Button render={<Link href="/checkout" />} nativeButton={false}>
            Proceder al checkout
          </Button>
        </div>
      </div>
    </div>
  );
}

function CartItemRow({ item, onRemove, onUpdateQty }) {
  const name =
    item.type === "product"
      ? getLocalizedField(item.product.name) || item.product.name
      : getLocalizedField(item.combo.name) || item.combo.name;

  const price =
    item.type === "product"
      ? Number(item.product.price_ves || 0)
      : Number(item.combo.price_ves || 0);

  const itemTotal = price * item.quantity;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h3 className="font-medium">{name}</h3>
            {item.type === "product" && item.extras?.length > 0 && (
              <div className="mt-1 space-y-1">
                {item.extras.map((extra) => (
                  <p key={extra.id || extra.extra?.id} className="text-xs text-muted-foreground">
                    + {getLocalizedField(extra.extra?.name) || extra.extra?.name}
                    {extra.quantity > 1 && ` x${extra.quantity}`}
                  </p>
                ))}
              </div>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              ${price.toFixed(2)} × {item.quantity}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQty(item.quantity - 1)}
              className="h-7 w-7 p-0"
            >
              −
            </Button>
            <span className="text-sm font-medium">{item.quantity}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQty(item.quantity + 1)}
              className="h-7 w-7 p-0"
            >
              +
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            ×
          </Button>
        </div>
        <div className="mt-2 text-right font-medium">
          ${Number(itemTotal).toFixed(2)} VES
        </div>
      </CardContent>
    </Card>
  );
}
