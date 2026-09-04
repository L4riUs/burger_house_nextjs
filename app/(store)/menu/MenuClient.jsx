"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, LayoutGridIcon, ListIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getLocalizedField } from "@/lib/i18n";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";

export function MenuClient({
  products: serverProducts,
  categories,
  pagination,
  initialSearch = "",
  initialCategory = "",
  initialPage = 1,
}) {
  const router = useRouter();

  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [page, setPage] = useState(initialPage);
  const [viewMode, setViewMode] = useState("cards");
  const [searchInput, setSearchInput] = useState(initialSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== initialSearch) {
        setSearch(searchInput);
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, initialSearch]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryId) params.set("category", categoryId);
    params.set("page", String(page));

    const newUrl = `/menu?${params.toString()}`;
    if (window.location.pathname + window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [search, categoryId, page, router]);

  const handleCategoryChange = (value) => {
    setCategoryId(value === "all" ? "" : value);
    setPage(1);
  };

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const paginationItems = useMemo(() => {
    if (!pagination || pagination.totalPages <= 1) return [];

    const items = [];
    const { page: currentPage, totalPages } = pagination;

    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (currentPage > 1) handlePageChange(currentPage - 1);
          }}
        />
      </PaginationItem>
    );

    const startPage = Math.max(1, currentPage - 1);
    const endPage = Math.min(totalPages, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={i === currentPage}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (totalPages > 3 && endPage < totalPages) {
      items.push(
        <PaginationItem key="ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            isActive={totalPages === currentPage}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    items.push(
      <PaginationItem key="next">
        <PaginationNext
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (currentPage < totalPages) handlePageChange(currentPage + 1);
          }}
        />
      </PaginationItem>
    );

    return items;
  }, [pagination, handlePageChange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Nuestro Menú</h1>
          <p className="text-muted-foreground">
            Descubre nuestras hamburguesas, combos y adicionales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={categoryId || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {getLocalizedField(cat.name) || cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {serverProducts.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {serverProducts.length} productos
          {pagination && (
            <span className="ml-2">
              (Página {pagination.page} de {pagination.totalPages})
            </span>
          )}
        </p>
      )}

      {serverProducts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No se encontraron productos
        </div>
      ) : viewMode === "table" ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serverProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <img
                        src={product.image_url || "/placeholder.png"}
                        alt={getLocalizedField(product.name) || product.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                      <span>{getLocalizedField(product.name) || product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getLocalizedField(product.category?.name) ||
                      product.category?.name ||
                      "—"}
                  </TableCell>
                  <TableCell>
                    ${Number(product.price_ves || 0).toFixed(2)} VES
                  </TableCell>
                  <TableCell className="text-right">
                    <AddToCartButton product={product} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {serverProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>{paginationItems}</PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }) {
  const name = getLocalizedField(product.name) || product.name;
  const description = product.description
    ? getLocalizedField(product.description)
    : "";
  const priceVES = Number(product.price_ves || 0);
  const priceUSD = Number(product.price_usd || 0);

  return (
    <Card className="h-full flex flex-col">
      {product.image_url && (
        <img
          src={product.image_url}
          alt={name}
          className="h-40 w-full object-cover rounded-t-lg"
        />
      )}
      <CardContent className="p-4 flex-1">
        <CardTitle className="text-lg">{name}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        )}
        <div className="mt-3 space-y-1">
          <p className="font-mono font-medium">${priceVES.toFixed(2)} VES</p>
          <p className="text-sm text-muted-foreground">
            ${priceUSD.toFixed(2)} USD
          </p>
        </div>
      </CardContent>
      <div className="p-4 pt-0">
        <AddToCartButton product={product} />
      </div>
    </Card>
  );
}
