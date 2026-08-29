"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { getLocalizedField } from "@/lib/i18n";
import { useCartStore } from "../store";

function ExtraSelector({ extras, selected, onToggle, onUpdateQty }) {
  return (
    <div className="space-y-3">
      {extras.map((extra) => {
        const extraName = getLocalizedField(extra.name) || extra.name;
        const extraPrice = Number(extra.price_ves || 0);
        const sel = selected.find((s) => s.extra?.id === extra.id);
        const isSelected = Boolean(sel);

        return (
          <div key={extra.id} className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggle(extra)}
              aria-label={extraName}
            />
            <span className="flex-1 text-sm">
              {extraName} {extraPrice > 0 && `+$${extraPrice.toFixed(2)}`}
            </span>
            {isSelected && (
              <Input
                type="number"
                min="1"
                max="10"
                value={sel.quantity || 1}
                onChange={(e) =>
                  onUpdateQty(extra.id, Number(e.target.value))
                }
                className="w-16"
                aria-label={`Cantidad de ${extraName}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AddToCartButton({ product, combo }) {
  const addProduct = useCartStore((state) => state.addProduct);
  const addCombo = useCartStore((state) => state.addCombo);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState([]);

  const item = product || combo;
  const isCombo = !!combo;

  if (!item) return null;

  const name = getLocalizedField(item.name) || item.name;
  const hasExtras = !isCombo && item.product_extras?.length > 0;

  const resetState = () => {
    setQuantity(1);
    setSelectedExtras([]);
  };

  const toggleExtra = (extra) => {
    setSelectedExtras((prev) => {
      const exists = prev.find((s) => s.extra?.id === extra.id);
      if (exists) {
        return prev.filter((s) => s.extra?.id !== extra.id);
      }
      return [...prev, { extra, quantity: 1 }];
    });
  };

  const updateExtraQty = (extraId, qty) => {
    setSelectedExtras((prev) =>
      prev.map((s) =>
        s.extra?.id === extraId
          ? { ...s, quantity: Math.max(1, Math.min(10, qty)) }
          : s
      )
    );
  };

  const handleAddWithExtras = () => {
    addProduct(product, quantity, selectedExtras);
    setSheetOpen(false);
    resetState();
  };

  const handleDirectAdd = () => {
    if (isCombo) {
      addCombo(combo, quantity);
    } else {
      addProduct(product, quantity);
    }
    resetState();
  };

  const triggerButton = (
    <Button
      size="sm"
      variant={item.is_sold_out ? "secondary" : "default"}
      disabled={item.is_sold_out}
    >
      {item.is_sold_out ? (
        "Agotado"
      ) : (
        <>
          <PlusIcon className="h-4 w-4 mr-1" />
          Agregar
        </>
      )}
    </Button>
  );

  if (!hasExtras) {
    return (
      <Button
        size="sm"
        variant={item.is_sold_out ? "secondary" : "default"}
        disabled={item.is_sold_out}
        onClick={handleDirectAdd}
      >
        {item.is_sold_out ? (
          "Agotado"
        ) : (
          <>
            <PlusIcon className="h-4 w-4 mr-1" />
            Agregar
          </>
        )}
      </Button>
    );
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger render={triggerButton} />
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{name}</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="qty" className="text-sm">
              Cantidad:
            </Label>
            <Input
              id="qty"
              type="number"
              min="1"
              max="99"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(99, Number(e.target.value))))
              }
              className="w-16"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Adicionales disponibles
            </Label>
            <ExtraSelector
              extras={product.product_extras || []}
              selected={selectedExtras}
              onToggle={toggleExtra}
              onUpdateQty={updateExtraQty}
            />
          </div>

          <div className="pt-4 border-t">
            <Button className="w-full" onClick={handleAddWithExtras}>
              Agregar al carrito
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
