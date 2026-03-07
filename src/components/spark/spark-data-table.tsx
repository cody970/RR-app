"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/infra/utils";
import { SparkButton } from "./spark-button";
import { SparkBadge } from "./spark-badge";

/**
 * SparkDataTable — Spark Design System generic data-table.
 *
 * Features:
 *  - Sortable column headers
 *  - Row hover highlight
 *  - SparkBadge for status columns
 *  - Client-side pagination via SparkButton
 *  - Accessible with proper aria attributes
 */
export type SortDirection = "asc" | "desc" | null;

export interface SparkColumn<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  /** Renders a SparkBadge when the column value matches a status key */
  statusMap?: Record<string, "success" | "warning" | "error" | "info" | "default" | "outline">;
  /** Custom cell renderer */
  cell?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface SparkDataTableProps<T extends Record<string, unknown>> {
  columns: SparkColumn<T>[];
  data: T[];
  /** Unique row key — defaults to "id" */
  rowKey?: keyof T;
  /** Rows shown per page (0 = show all) */
  pageSize?: number;
  caption?: string;
  className?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

function SparkDataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey = "id" as keyof T,
  pageSize = 10,
  caption,
  className,
  emptyMessage = "No records found.",
  onRowClick,
}: SparkDataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(null);
  const [page, setPage] = React.useState(1);

  // Sort
  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // Paginate
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  const pagedData =
    pageSize > 0 ? sortedData.slice((page - 1) * pageSize, page * pageSize) : sortedData;

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  };

  return (
    <div data-spark="data-table" className={cn("flex flex-col gap-3", className)}>
      <div className="overflow-x-auto rounded-[var(--sprk-border-radius)] border border-[var(--sprk-border-color)]">
        <table
          className="w-full text-sm"
          role="grid"
          aria-label={caption}
        >
          {caption && (
            <caption className="sr-only">{caption}</caption>
          )}

          <thead className="border-b border-[var(--sprk-border-color)] bg-[var(--sprk-color-neutral-50)] dark:bg-[var(--sprk-color-neutral-100)]">
            <tr role="row">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  role="columnheader"
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : col.sortable
                      ? "none"
                      : undefined
                  }
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                    "text-[var(--sprk-color-neutral-500)] dark:text-[var(--sprk-color-neutral-400)]",
                    col.sortable && "cursor-pointer select-none hover:text-slate-900 dark:hover:text-white",
                    col.headerClassName
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex flex-col" aria-hidden="true">
                        <ChevronUp
                          className={cn(
                            "size-3 -mb-1",
                            sortKey === col.key && sortDir === "asc"
                              ? "text-[var(--sprk-color-primary)]"
                              : "opacity-30"
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            "size-3",
                            sortKey === col.key && sortDir === "desc"
                              ? "text-[var(--sprk-color-primary)]"
                              : "opacity-30"
                          )}
                        />
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--sprk-border-color)] bg-white dark:bg-transparent">
            {pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pagedData.map((row) => (
                <tr
                  key={String(row[rowKey])}
                  role="row"
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => e.key === "Enter" && onRowClick(row)
                      : undefined
                  }
                  className={cn(
                    "transition-colors",
                    onRowClick
                      ? "cursor-pointer hover:bg-[var(--sprk-color-neutral-50)] dark:hover:bg-[var(--sprk-color-neutral-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sprk-color-primary)]"
                      : "hover:bg-[var(--sprk-color-neutral-50)]/50 dark:hover:bg-[var(--sprk-color-neutral-100)]/30"
                  )}
                >
                  {columns.map((col) => {
                    const value = row[col.key];

                    let content: React.ReactNode;
                    if (col.cell) {
                      content = col.cell(value, row);
                    } else if (col.statusMap && typeof value === "string" && col.statusMap[value]) {
                      content = (
                        <SparkBadge variant={col.statusMap[value]}>
                          {value}
                        </SparkBadge>
                      );
                    } else {
                      content = value !== null && value !== undefined ? String(value) : "—";
                    }

                    return (
                      <td
                        key={col.key}
                        role="gridcell"
                        className={cn(
                          "px-4 py-3 text-slate-700 dark:text-slate-300",
                          col.className
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-xs text-muted-foreground">
            Showing {Math.min((page - 1) * pageSize + 1, sortedData.length)}–
            {Math.min(page * pageSize, sortedData.length)} of {sortedData.length}
          </p>

          <div className="flex items-center gap-1" role="navigation" aria-label="Pagination">
            <SparkButton
              variant="tertiary"
              size="icon-sm"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </SparkButton>

            <span className="min-w-[3rem] text-center text-xs font-medium text-muted-foreground">
              {page} / {totalPages}
            </span>

            <SparkButton
              variant="tertiary"
              size="icon-sm"
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </SparkButton>
          </div>
        </div>
      )}
    </div>
  );
}

SparkDataTable.displayName = "SparkDataTable";

export { SparkDataTable };
