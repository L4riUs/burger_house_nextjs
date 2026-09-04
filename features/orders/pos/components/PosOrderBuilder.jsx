"use client";

import { useState } from "react";
import { usePosStore, calculatePosItemTotal } from "../store";
import { formatCurrency } from "@/lib/utils";
import { getLocalizedField } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, Pencil, PlusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function PosItemExtrasPopover({ item, onConfirm, children }) {
  const [open, setOpen] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [extras, setExtras] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) return;

    setSelectedExtras(item.extras || []);
    setLoadingExtras(true);
    const supabase = createClient();
    supabase
      .from('product_extra_options')
      .select('extra:product_extras(id, name, price_ves, price_usd)')
      .eq('product_id', item.product.id)
      .then(({ data, error }) => {
        if (error) console.error("Error fetching extras:", error);
        const parsedExtras = data?.map(opt => opt.extra).filter(Boolean) || [];
        setExtras(parsedExtras);
        setLoadingExtras(false);
      });
  };

  const toggleExtra = (extra) => {
    setSelectedExtras((prev) => {
      const exists = prev.find((s) => s.extra?.id === extra.id);
      if (exists) return prev.filter((s) => s.extra?.id !== extra.id);
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

  const handleConfirm = () => {
    onConfirm(selectedExtras);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={children} />
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <h4 className="font-medium text-sm leading-none">Adicionales disponibles</h4>
          
          {loadingExtras ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : extras.length > 0 ? (
            <div className="space-y-3">
              {extras.map((extra) => {
                const extraName = getLocalizedField(extra.name) || extra.name;
                const extraPrice = Number(extra.price_ves || 0);
                const sel = selectedExtras.find((s) => s.extra?.id === extra.id);
                return (
                  <div key={extra.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={Boolean(sel)}
                      onCheckedChange={() => toggleExtra(extra)}
                    />
                    <span className="flex-1 text-sm truncate">
                      {extraName}{extraPrice > 0 && ` +${formatCurrency(extraPrice)}`}
                    </span>
                    {sel && (
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={sel.quantity || 1}
                        onChange={(e) => updateExtraQty(extra.id, Number(e.target.value))}
                        className="w-16 h-8 text-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Este producto no tiene adicionales.</p>
          )}

          <div className="pt-2">
            <Button size="sm" className="w-full" onClick={handleConfirm}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

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

                  {/* Botón de adicionales: editar si ya tiene, agregar si no tiene (solo productos) */}
                  {item.type === 'product' && (
                    <PosItemExtrasPopover
                      item={item}
                      onConfirm={(extras) => updateExtras(item.id, extras)}
                    >
                      {item.extras && item.extras.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 text-xs gap-1 text-primary hover:text-primary"
                          title="Editar adicionales"
                        >
                          <Pencil className="h-3 w-3" />
                          {item.extras.length} adicional{item.extras.length !== 1 ? 'es' : ''}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          title="Agregar adicionales"
                        >
                          <PlusCircle className="h-3 w-3" />
                          Adicionales
                        </Button>
                      )}
                    </PosItemExtrasPopover>
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
                    {item.extras.map((extra) => {
                      const extraName =
                        getLocalizedField(extra.extra?.name) ||
                        extra.extra?.name ||
                        extra.name ||
                        "Adicional";
                      const extraPrice = extra.price_ves || extra.extra?.price_ves || 0;
                      const extraQty = extra.quantity || 1;
                      return (
                        <div key={extra.id} className="text-sm text-muted-foreground flex items-center justify-between gap-2">
                          <span>+ {extraName} ×{extraQty}</span>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(extraPrice * extraQty * item.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="text-right font-bold tabular-nums">
                {formatCurrency(calculatePosItemTotal(item))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}