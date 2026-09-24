"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getLocalizedField } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { X, Loader2, Plus, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const getDisplayText = (value) => getLocalizedField(value, 'es') || value || '';

export function PosProductExtrasModal({ open, onOpenChange, product, combo, onConfirm }) {
  const [extras, setExtras] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [itemNotes, setItemNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExtras = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      if (product) {
        const { data, error } = await supabase
          .from('product_extra_options')
          .select('extra:product_extras(id, name, price_ves, price_usd)')
          .eq('product_id', product.id);

        if (error) throw error;
        const parsedExtras = data?.map(opt => opt.extra).filter(Boolean) || [];
        setExtras(parsedExtras);
      } else if (combo) {
        // Para combos, por ahora no hay extras (schema actual)
        // Si en el futuro se agrega combo_extras, se implementa aquí
        setExtras([]);
      }
    } catch (err) {
      console.error("[PosProductExtrasModal] Error fetching extras:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedExtras([]);
      setItemNotes('');
      fetchExtras();
    }
  }, [open, product, combo]);

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
    onConfirm(selectedExtras, itemNotes.trim());
    onOpenChange(false);
  };

  if (!open) return null;

  const itemName = product ? getDisplayText(product.name) : combo ? getDisplayText(combo.name) : '';
  const hasExtras = extras.length > 0;
  const totalSelectedCount = selectedExtras.reduce((sum, s) => sum + (s.quantity || 1), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate pr-2">Opciones para {itemName}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Cargando adicionales...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive text-sm">
              Error cargando adicionales: {error}
            </div>
          ) : hasExtras ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {extras.map((extra) => {
                const extraName = getDisplayText(extra.name) || extra.name;
                const extraPrice = Number(extra.price_ves || 0);
                const sel = selectedExtras.find((s) => s.extra?.id === extra.id);
                const isSelected = Boolean(sel);
                const qty = sel?.quantity || 1;

                return (
                  <div
                    key={extra.id}
                    onClick={() => toggleExtra(extra)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer select-none ${
                      isSelected
                        ? "border-primary/60 bg-primary/5 shadow-xs"
                        : "hover:bg-accent/60 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleExtra(extra)}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-none"
                      />
                      <div className="min-w-0">
                        <p className={`font-medium text-sm truncate ${isSelected ? "text-primary" : ""}`}>
                          {extraName}
                        </p>
                        {extraPrice > 0 && (
                          <p className="text-xs text-muted-foreground">
                            +{formatCurrency(extraPrice)}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="flex items-center gap-1 bg-background border rounded-lg p-1 shadow-xs ml-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => updateExtraQty(extra.id, qty - 1)}
                          title={qty === 1 ? "Quitar adicional" : "Disminuir"}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-xs font-bold tabular-nums">
                          {qty}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => updateExtraQty(extra.id, qty + 1)}
                          title="Aumentar"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm font-medium">Este producto no tiene adicionales configurados.</p>
            </div>
          )}

          {/* Campo para nota específica del producto */}
          <div className="space-y-1.5 pt-2 border-t">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Nota o instrucción especial</span>
              <span className="text-muted-foreground font-normal text-[11px]">(opcional)</span>
            </label>
            <Input
              placeholder="Ej. Sin cebolla, término medio, salsa aparte..."
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={loading}>
              {selectedExtras.length > 0
                ? `Agregar (${totalSelectedCount} ${totalSelectedCount === 1 ? 'extra' : 'extras'})`
                : hasExtras
                ? 'Agregar a la orden'
                : 'Agregar a la orden'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}