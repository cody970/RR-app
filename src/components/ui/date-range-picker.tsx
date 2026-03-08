"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/infra/utils";
import "react-day-picker/style.css";

export type { DateRange };

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const label = value?.from
    ? value.to
      ? `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`
      : format(value.from, "MMM d, yyyy")
    : placeholder;

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full min-w-[240px] items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
      >
        <span className="flex items-center gap-2">
          <Calendar
            className="h-4 w-4 text-slate-400 flex-shrink-0"
            aria-hidden="true"
          />
          <span
            className={
              value?.from
                ? "text-slate-900 dark:text-slate-100 text-sm"
                : "text-slate-400 dark:text-slate-500 text-sm"
            }
          >
            {label}
          </span>
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {value?.from && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date range"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange?.(undefined);
                }
              }}
              className="p-0.5 rounded hover:text-red-500 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Date range calendar"
          className="absolute top-full left-0 mt-2 z-50 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 overflow-hidden"
        >
          <DayPicker
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            className="p-4"
          />
          <div className="px-4 pb-4 flex justify-end gap-2 border-t border-slate-100 dark:border-white/10 pt-3">
            <button
              onClick={() => {
                onChange?.(undefined);
                setOpen(false);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
