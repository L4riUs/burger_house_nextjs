"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, FilterIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControl } from "@/components/shared/pagination-control";
import { listAuditLogs } from "./actions";
import { AuditTable } from "./components/AuditTable";
import { AuditFilters } from "./components/AuditFilters";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    entity: null,
    actor_id: null,
    action: null,
    date_from: null,
    date_to: null,
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAuditLogs(filters);
      if (result.error) {
        console.error(result.error);
      } else {
        setLogs(result.data || []);
        setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error("[AuditPage] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FilterIcon className="h-6 w-6 text-orange-500" />
          Auditoría del Sistema
        </h1>
        <p className="text-muted-foreground mt-1">
          Registro de operaciones sensibles (solo owner/admin)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditFilters filters={filters} onChange={handleFiltersChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <AuditTable logs={logs} />
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
                    {pagination.total} registros
                  </p>
                  <PaginationControl
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}