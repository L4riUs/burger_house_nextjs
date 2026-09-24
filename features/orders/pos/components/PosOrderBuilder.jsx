"use client";

import { useState } from "react";
import { usePosStore, calculatePosItemTotal } from "../store";
import { formatCurrency } from "@/lib/utils";
import { getLocalizedField } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, Pencil, PlusCircle, MessageSquare, MessageSquarePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const getDisplayText = (value) => getLocalizedField(value, 'es') || value || '';

function PosItemNotePopover({ item, onSave, children }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(item.notes || '');

  const handleOpenChange = (next) => {
    setOpen(next);
    if (next) setNote(item.notes || '');
  };

  const handleSave = () => {
    onSave(note.trim());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={children} />
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold">Nota para cocina / preparación</h5>
            {item.notes && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Activa</span>
            )}
          </div>
          <Input
            autoFocus
            placeholder="Ej. Sin cebolla, término medio, etc."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            className="h-8 text-xs"
          />
          <div className="flex gap-2 justify-end pt-1">
            {item.notes && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onSave('');
                  setOpen(false);
                }}
              >
                Quitar nota
              </Button>
            )}
            <Button type="button" size="sm" className="h-7 text-xs" onClick={handleSave}>
              Guardar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
    if (qty <= 0) {
      setSelectedExtras((prev) => prev.filter((s) => s.extra?.id !== extraId));
      return;
    }
    setSelectedExtras((prev) =>
      prev.map((s) =>
        s.extra?.id === extraId
          ? { ...s, quantity: Math.min(10, qty) }
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
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Adicionales</h4>
            <span className="text-xs text-muted-foreground">
              {selectedExtras.length} seleccionado{selectedExtras.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {loadingExtras ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Cargando...</p>
          ) : extras.length > 0 ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
              {extras.map((extra) => {
                const extraName = getLocalizedField(extra.name) || extra.name;
                const extraPrice = Number(extra.price_ves || 0);
                const sel = selectedExtras.find((s) => s.extra?.id === extra.id);
                const isSelected = Boolean(sel);
                const qty = sel?.quantity || 1;

                return (
                  <div
                    key={extra.id}
                    onClick={() => toggleExtra(extra)}
                    className={`flex items-center justify-between p-2 rounded-md border transition-all cursor-pointer select-none ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "hover:bg-accent/60 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleExtra(extra)}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-none"
                      />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${isSelected ? "text-primary" : ""}`}>
                          {extraName}
                        </p>
                        {extraPrice > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            +{formatCurrency(extraPrice)}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="flex items-center gap-1 bg-background border rounded-md p-0.5 shadow-2xs ml-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground"
                          onClick={() => updateExtraQty(extra.id, qty - 1)}
                          title={qty === 1 ? "Quitar" : "Disminuir"}
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="w-4 text-center text-xs font-bold tabular-nums">
                          {qty}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground"
                          onClick={() => updateExtraQty(extra.id, qty + 1)}
                          title="Aumentar"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2 text-center">Este producto no tiene adicionales.</p>
          )}

          <div className="pt-1">
            <Button size="sm" className="w-full h-8 text-xs" onClick={handleConfirm}>
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
    updateItemNotes,
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
                  <span className="font-medium truncate">
                    {getDisplayText(item.product?.name) || getDisplayText(item.combo?.name) || 'Producto'}
                  </span>
                  {item.type === 'combo' && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">Combo</span>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(item.type === 'combo' ? item.combo.price_ves : item.product.price_ves)} c/u
                </p>

                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
                          className="text-xs gap-1 text-primary hover:text-primary h-7 px-2"
                          title="Editar adicionales"
                        >
                          <Pencil className="h-3 w-3" />
                          {item.extras.length} adicional{item.extras.length !== 1 ? 'es' : ''}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1 text-muted-foreground hover:text-foreground h-7 px-2"
                          title="Agregar adicionales"
                        >
                          <PlusCircle className="h-3 w-3" />
                          Adicionales
                        </Button>
                      )}
                    </PosItemExtrasPopover>
                  )}

                  {/* Botón de nota por ítem */}
                  <PosItemNotePopover
                    item={item}
                    onSave={(notes) => updateItemNotes(item.id, notes)}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 text-xs gap-1 ${
                        item.notes
                          ? 'text-amber-600 dark:text-amber-400 font-medium hover:text-amber-700'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title={item.notes ? "Editar nota de preparación" : "Agregar nota de preparación"}
                    >
                      {item.notes ? (
                        <MessageSquare className="h-3 w-3" />
                      ) : (
                        <MessageSquarePlus className="h-3 w-3" />
                      )}
                      {item.notes ? 'Nota' : '+ Nota'}
                    </Button>
                  </PosItemNotePopover>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                    title="Quitar producto"
                    aria-label="Quitar producto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Nota del ítem si existe */}
                {item.notes && (
                  <div className="mt-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 flex items-start gap-1">
                    <span className="font-semibold select-none">Nota:</span>
                    <span className="italic break-words">{item.notes}</span>
                  </div>
                )}

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
                          <span>
                            + {extraName}
                            {extraQty > 1 && (
                              <span className="font-semibold text-foreground ml-1">×{extraQty}</span>
                            )}
                          </span>
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