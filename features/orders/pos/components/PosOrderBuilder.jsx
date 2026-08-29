"use client";

import { usePosStore } from "../store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function PosOrderBuilder() {
  const {
    items,
    removeItem,
    updateQuantity,
    updateExtras,
    getSubtotalVES,
  } = usePosStore();

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>La orden está vacía</p>
        <p className="text-sm">Agrega productos desde la izquierda</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span>{items.length} productos</span>
        <span className="font-bold tabular-nums">{formatCurrency(getSubtotalVES())}</span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-3 bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.product?.name || item.combo?.name}</span>
                  {item.type === 'combo' && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">Combo</span>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(item.type === 'combo' ? item.combo.price_ves : item.product.price_ves)} c/u
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="font-mono tabular-nums w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>

                  {item.extras && item.extras.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-xs"
                    >
                      +{item.extras.length} extras
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {item.extras && item.extras.length > 0 && (
                  <div className="mt-2 ml-4 space-y-1 border-l-2 border-border pl-2">
                    {item.extras.map((extra) => (
                      <div key={extra.id} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>+ {extra.extra?.name || extra.name || 'Extra'}</span>
                        <span>×{extra.quantity}</span>
                        <span className="font-medium">{formatCurrency(extra.price_ves || extra.extra?.price_ves || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-right font-bold tabular-nums">
                {formatCurrency(
                  (item.type === 'combo' ? item.combo.price_ves : item.product.price_ves) * item.quantity +
                  (item.extras?.reduce((sum, e) => sum + (e.price_ves || e.extra?.price_ves || 0) * e.quantity, 0) || 0)
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}