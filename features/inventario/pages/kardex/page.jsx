"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getInventoryMovementsByItem, listRawMaterialsForMovement, listProductsForMovement, getCurrentStock } from "../../actions";
import { MovementTable } from "../../components/MovementTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControl } from "@/components/shared/pagination-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCwIcon, PackageIcon } from "lucide-react";

const ITEM_TYPE_OPTIONS = [
  { value: "raw_material", label: "Materias Primas" },
  { value: "product", label: "Productos Retail (Fase 4)" },
];

export default function KardexPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState(searchParams.get("item_type") || "raw_material");
  const [itemId, setItemId] = useState(searchParams.get("item_id") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentStock, setCurrentStock] = useState(0);

  // Compute display labels for selected values
  const selectedItemLabel = itemType === "raw_material" 
    ? rawMaterials.find(m => m.id === itemId)?.name 
    : products.find(p => p.id === itemId)?.name?.es || products.find(p => p.id === itemId)?.name;

  const items = itemType === "raw_material" ? rawMaterials : products;
  const selectedItem = itemId ? items.find(i => i.id === itemId) || null : null;

  const fetchMovements = useCallback(async () => {
    if (!itemId) {
      setMovements([]);
      setPagination(null);
      setCurrentStock(0);
      return;
    }

    setLoading(true);
    const result = await getInventoryMovementsByItem(itemType, itemId, { page, pageSize: 50 });

    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }

    setMovements(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [itemType, itemId, page]);

  const fetchStock = useCallback(async () => {
    if (!itemId) return;
    const result = await getCurrentStock(itemType, itemId);
    setCurrentStock(result.stock || 0);
  }, [itemType, itemId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!itemId) {
        if (!cancelled) {
          setMovements([]);
          setPagination(null);
          setCurrentStock(0);
        }
        return;
      }

      setLoading(true);
      const result = await getInventoryMovementsByItem(itemType, itemId, { page, pageSize: 50 });

      if (!cancelled) {
        if (result.error) {
          console.error(result.error);
        } else {
          setMovements(result.data || []);
          setPagination(result.pagination);
        }
        setLoading(false);
      }

      const stockResult = await getCurrentStock(itemType, itemId);
      if (!cancelled) {
        setCurrentStock(stockResult.stock || 0);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [itemType, itemId, page]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [matResult, prodResult] = await Promise.all([
        listRawMaterialsForMovement(),
        listProductsForMovement(),
      ]);
      if (!matResult.error) setRawMaterials(matResult.data || []);
      if (!prodResult.error) setProducts(prodResult.data || []);
    };
    fetchLookups();
  }, []);

  const handleItemTypeChange = (value) => {
    setItemType(value);
    setItemId("");
    setPage(1);
  };

  const handleItemIdChange = (value) => {
    setItemId(value);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchMovements();
    fetchStock();
  };

  const selectedItemTypeLabel = ITEM_TYPE_OPTIONS.find((o) => o.value === itemType)?.label || "Materias Primas";
  const itemOptions = items.map((item) => ({
    value: item.id,
    label: item.unit ? `${item.name} (${item.unit.abbreviation})` : item.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kardex de Inventario</h1>
          <p className="text-muted-foreground">
            Historial de movimientos y stock actual por ítem
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <div className="grid gap-3 sm:grid-cols-2 items-end">
          <Select
            value={itemType}
            onValueChange={handleItemTypeChange}
            items={ITEM_TYPE_OPTIONS}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo de ítem">{selectedItemTypeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ITEM_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.value === "product"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={itemId || undefined}
            onValueChange={handleItemIdChange}
            items={itemOptions}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un ítem">{selectedItemLabel || ""}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} {item.unit && `(${item.unit.abbreviation})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedItem && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">Ítem</p>
            <p className="font-semibold">{selectedItem.name}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">Unidad</p>
            <p className="font-semibold">{selectedItem.unit?.name || selectedItem.unit?.abbreviation || "—"}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">Stock Mínimo</p>
            <p className="font-semibold">{Number(selectedItem.min_stock || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">Stock Actual</p>
            <p className="text-2xl font-bold text-green-900">{Number(currentStock).toLocaleString()}</p>
          </div>
        </div>
      )}

      {itemId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Historial de Movimientos</h2>
            <span className="text-sm text-muted-foreground">
              {movements.length} movimiento{movements.length !== 1 ? "s" : ""} {pagination && `de ${pagination.total} total`}
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <MovementTable
              movements={movements}
            />
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
                {pagination.total} movimientos
              </p>
              <PaginationControl
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {!itemId && (
        <div className="text-center py-12">
          <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Selecciona un ítem para ver su historial de movimientos</p>
        </div>
      )}
    </div>
  );
}