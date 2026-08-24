import { listPublicProducts, listPublicCategories } from "@/features/catalog/actions";
import { MenuClient } from "./MenuClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 300;

export const metadata = {
  title: "Menú | Burger House",
  description: "Descubre nuestras hamburguesas, combos y adicionales",
};

export default async function MenuPage({ searchParams }) {
  const { category, search, page = "1" } = await searchParams || {};

  const [productsRes, categoriesRes] = await Promise.all([
    listPublicProducts({
      categoryId: category,
      search: search || undefined,
      page: Number(page),
      pageSize: 12,
    }),
    listPublicCategories(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<MenuSkeleton />}>
        <MenuClient
          products={productsRes.data || []}
          categories={categoriesRes.data || []}
          pagination={productsRes.pagination}
          initialSearch={search || ""}
          initialCategory={category || ""}
          initialPage={Number(page)}
        />
      </Suspense>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    </div>
  );
}
