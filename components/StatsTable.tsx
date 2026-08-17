"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: keyof T | string;
  label: string;
  /** Render a cell. */
  render?: (row: T) => React.ReactNode;
  /** Allow sorting by this column. */
  sortable?: boolean;
  /** Read a sortable value (defaults to row[key]). */
  sortValue?: (row: T) => number | string;
  className?: string;
  align?: "left" | "right" | "center";
}

interface SortState {
  key: string;
  dir: "asc" | "desc";
}

export default function StatsTable<T extends Record<string, any>>({
  columns,
  rows,
  initialSort,
  emptyText = "No results.",
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  initialSort?: SortState;
  emptyText?: string;
}) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = (r: T) =>
      col.sortValue ? col.sortValue(r) : (r as any)[col.key as string];
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [rows, columns, sort]);

  function toggleSort(key: string) {
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white dark:bg-white/[0.04] text-xs uppercase tracking-wider text-brand-navy/60 dark:text-white/60">
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={cn(
                    "px-4 py-3 font-medium",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.sortable && "sortable",
                    c.className
                  )}
                  onClick={() => c.sortable && toggleSort(String(c.key))}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable && sort?.key === c.key && (
                      <span aria-hidden="true">{sort.dir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-navy/[0.07] dark:divide-white/5">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-brand-navy/60 dark:text-white/60"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={i}
                  className="hover:bg-brand-navy/[0.04] hover:dark:bg-white/[0.04] transition-colors"
                >
                  {columns.map((c) => (
                    <td
                      key={String(c.key)}
                      className={cn(
                        "px-4 py-3 text-brand-navy/85 dark:text-white/90",
                        c.align === "right" && "text-right tabular-nums",
                        c.align === "center" && "text-center",
                        c.className
                      )}
                    >
                      {c.render
                        ? c.render(row)
                        : (row as any)[c.key as string] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
