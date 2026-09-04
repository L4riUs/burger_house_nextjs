"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { listInventoryMovements, createInventoryMovement, listRawMaterialsForMovement, listProductsForMovement, listSuppliersForMovement } from "../../actions";
import { MovementForm } from "../../components/MovementForm";
import { MovementTable } from "../../components/MovementTable";
import { MovementFilters } from "../../components/MovementFilters";
import { StockAlertWidget } from "../../components/StockAlertWidget";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControl } from "@/components/shared/pagination-control";
import { PlusIcon, RefreshCwIcon } from "lucide-react";

export default function MovimientosPage() {
  const { toastSuccess, toastError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    itemType: searchParams.get("item_type") || "all",
    movementType: searchParams.get("movement_type") || "all",
    dateFrom: searchParams.get("date_from") || "",
    dateTo: searchParams.get("date_to") || "",
    itemId: searchParams.get("item_id") || "",
  });
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    const params = {
      page,
      pageSize: 20,
      itemType: filters.itemType === "all" ? undefined : filters.itemType,
      itemId: filters.itemId || undefined,
      movementType: filters.movementType === "all" ? undefined : filters.movementType,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    };

    const result = await listInventoryMovements(params);

    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }

    setMovements(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, filters.itemType, filters.itemId, filters.movementType, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const params = {
        page,
        pageSize: 20,
        itemType: filters.itemType === "all" ? undefined : filters.itemType,
        itemId: filters.itemId || undefined,
        movementType: filters.movementType === "all" ? undefined : filters.movementType,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      };

      const result = await listInventoryMovements(params);

      if (!cancelled) {
        if (result.error) {
          console.error(result.error);
        } else {
          setMovements(result.data || []);
          setPagination(result.pagination);
        }
        setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [page, filters.itemType, filters.itemId, filters.movementType, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [matResult, prodResult, supResult] = await Promise.all([
        listRawMaterialsForMovement(),
        listProductsForMovement(),
        listSuppliersForMovement(),
      ]);
      if (!matResult.error) setRawMaterials(matResult.data || []);
      if (!prodResult.error) setProducts(prodResult.data || []);
      if (!supResult.error) setSuppliers(supResult.data || []);
    };
    fetchLookups();
  }, []);

  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);
    const result = await createInventoryMovement(data);
    setFormLoading(false);

    if (result.error) {
      toastError(result.error);
      return;
    }

    toastSuccess(result.success);
    setFormOpen(false);
    fetchMovements();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
  };

  const handleRefresh = () => {
    fetchMovements();
  };

  const hasFilters = filters.search || filters.itemType !== "all" || filters.movementType !== "all" || filters.dateFrom || filters.dateTo || filters.itemId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registro de Movimientos</h1>
          <p className="text-muted-foreground">
            Registra entradas, salidas, ajustes y transferencias de inventario
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      <StockAlertWidget 
        materials={rawMaterials} 
        maxItems={10}
      />

      <MovementFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        hasFilters={hasFilters}
      />

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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-6">Registrar Movimiento de Inventario</h2>
            <MovementForm
              initialData={null}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isLoading={formLoading}
              rawMaterials={rawMaterials}
              products={products}
              suppliers={suppliers}
            />
          </div>
        </div>
      )}
    </div>
  );
}