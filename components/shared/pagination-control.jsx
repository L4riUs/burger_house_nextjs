import { useMemo } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function PaginationControl({ page, totalPages, onPageChange, className }) {
  const items = useMemo(() => {
    if (!totalPages || totalPages <= 1) return [];

    const components = [];

    components.push(
      <PaginationItem key="prev">
        <PaginationPrevious
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (page > 1) onPageChange(page - 1);
          }}
        />
      </PaginationItem>
    );

    const startPage = Math.max(1, page - 1);
    const endPage = Math.min(totalPages, page + 1);

    for (let i = startPage; i <= endPage; i++) {
      components.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={i === page}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (totalPages > 3 && endPage < totalPages) {
      components.push(
        <PaginationItem key="ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
      components.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            isActive={totalPages === page}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    components.push(
      <PaginationItem key="next">
        <PaginationNext
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (page < totalPages) onPageChange(page + 1);
          }}
        />
      </PaginationItem>
    );

    return components;
  }, [page, totalPages, onPageChange]);

  if (totalPages <= 1) return null;

  return (
    <Pagination className={className}>
      <PaginationContent>{items}</PaginationContent>
    </Pagination>
  );
}