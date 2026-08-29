"use client";

import { TrashIcon, PlusIcon, MinusIcon, ShoppingCartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getLocalizedField } from "@/lib/i18n";
import { useCartStore } from "../store";

export function CartDrawer({ trigger }) {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const getSubtotalVES = useCartStore((state) => state.getSubtotalVES);
  const getItemCount = useCartStore((state) => state.getItemCount);

  return (
    <Sheet>
      <SheetTrigger render={trigger || CartButtonWithBadge} />
      <SheetContent className="flex w-full max-w-md flex-col">
        <SheetHeader>
          <SheetTitle>Carrito de compras</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="text-center">
              <ShoppingCartIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                El carrito está vacío
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4">
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
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter className="flex flex-col gap-4 border-t pt-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total</span>
              <span>${Number(getSubtotalVES()).toFixed(2)} VES</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                className="flex-1"
              >
                Vaciar carrito
              </Button>
              <Button render={<Link href="/checkout" />} nativeButton={false} className="flex-1">
                Proceder al checkout
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartButtonWithBadge({ onOpenChange, ...props }) {
  const itemCount = useCartStore((state) => state.getItemCount());
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => onOpenChange?.(true)}
      {...props}
    >
      <ShoppingCartIcon className="h-5 w-5" />
      {itemCount > 0 && (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
        >
          {itemCount}
        </Badge>
      )}
    </Button>
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

  const image = item.type === "product" ? item.product.image_url : item.combo.image_url;
  const isSoldOut =
    item.type === "product" && item.product.is_sold_out;

  return (
    <div className="flex gap-3">
      {image && (
        <img
          src={image}
          alt={name}
          className="h-16 w-16 rounded-md object-cover"
        />
      )}
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium line-clamp-1">{name}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
          >
            <TrashIcon className="h-3 w-3" />
          </Button>
        </div>

        {item.type === "product" && item.extras && item.extras.length > 0 && (
          <div className="space-y-1">
            {item.extras.map((extra) => (
              <div key={extra.id || extra.extra?.id} className="text-xs text-muted-foreground">
                + {getLocalizedField(extra.extra?.name) || extra.extra?.name || extra.name}
                x{extra.quantity || 1}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => onUpdateQty(item.quantity - 1)}
            disabled={isSoldOut}
          >
            <MinusIcon className="h-3 w-3" />
          </Button>
          <span className="px-1">{item.quantity}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => onUpdateQty(item.quantity + 1)}
            disabled={isSoldOut}
          >
            <PlusIcon className="h-3 w-3" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          ${price.toFixed(2)} x {item.quantity}
        </div>
      </div>
    </div>
  );
}
