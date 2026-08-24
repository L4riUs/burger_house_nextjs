"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategoriesForProducts,
  listRawMaterialsForRecipe,
  getProduct,
} from "./actions";
import { ProductForm } from "./components/ProductForm";
import { ProductTable } from "./components/ProductTable";
import { ProductCards } from "./components/ProductCards";
import { ProductFilters } from "./components/ProductFilters";
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
import { LayoutGridIcon, ListIcon, PlusIcon, RefreshCwIcon } from "lucide-react";

export default function ProductsPage() {
  const { toastSuccess, toastError } = useToast();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const result = await listProducts({
      page,
      pageSize: 10,
      categoryId: categoryId || undefined,
      productType: productType || undefined,
      search: search || undefined,
    });

    if (result.error) {
      console.error(result.error);
      setLoading(false);
      return;
    }

    setProducts(result.data || []);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, categoryId, productType, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [catResult, rmResult] = await Promise.all([
        listCategoriesForProducts(),
        listRawMaterialsForRecipe(),
      ]);
      if (!catResult.error) setCategories(catResult.data || []);
      if (!rmResult.error) setRawMaterials(rmResult.data || []);
    };
    fetchLookups();
  }, []);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (value) => {
    setCategoryId(value);
    setPage(1);
  };

  const handleProductTypeChange = (value) => {
    setProductType(value);
    setPage(1);
  };

  const handleEdit = async (product) => {
    const result = await getProduct(product.id);
    if (!result.error && result.data) {
      setEditingProduct(result.data);
      setFormOpen(true);
    } else {
      toastError(result.error || "Error al cargar detalles del producto");
    }
  };

  const handleDelete = (product) => {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;

    setFormLoading(true);
    const result = await deleteProduct(deletingProduct.id);
    setFormLoading(false);

    if (result.error) {
      toastError(result.error);
      return;
    }

    toastSuccess(result.success);
    setDeleteDialogOpen(false);
    setDeletingProduct(null);
    fetchProducts();
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);

    let result;
    if (editingProduct) {
      result = await updateProduct(editingProduct.id, data);
    } else {
      result = await createProduct(data);
    }

    setFormLoading(false);

    if (result.error) {
      toastError(result.error);
      return;
    }

    toastSuccess(result.success);
    setFormOpen(false);
    setEditingProduct(null);
    fetchProducts();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingProduct(null);
  };

  const handleRefresh = () => {
    fetchProducts();
  };

  const hasFilters = search || categoryId || productType;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Administra el catálogo de productos preparados y retail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <ProductFilters
        search={search}
        onSearch={handleSearch}
        categoryId={categoryId}
        onCategoryIdChange={handleCategoryChange}
        productType={productType}
        onProductTypeChange={handleProductTypeChange}
        categories={categories}
        hasFilters={hasFilters}
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <ProductTable
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <ProductCards
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} productos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-6">
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <ProductForm
              initialData={editingProduct}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isLoading={formLoading}
              categories={categories}
              rawMaterials={rawMaterials}
            />
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar{" "}
              <strong>{deletingProduct?.name?.es || deletingProduct?.name}</strong>?
              Esta acción la moverá a la papelera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={formLoading}>
              {formLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
