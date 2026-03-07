"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/infra/utils";

/**
 * SparkModal — Spark Design System modal / dialog wrapper.
 *
 * Renders a portal-style overlay with a centred dialog panel.
 * Traps focus and closes on Escape key or backdrop click.
 */
export interface SparkModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Max-width variant; defaults to "md" */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children?: React.ReactNode;
  className?: string;
  /** Hides the default close (×) button */
  hideCloseButton?: boolean;
}

const sizeClasses = {
  sm:   "max-w-sm",
  md:   "max-w-lg",
  lg:   "max-w-2xl",
  xl:   "max-w-4xl",
  full: "max-w-[95vw]",
} as const;

const SparkModal: React.FC<SparkModalProps> = ({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  className,
  hideCloseButton = false,
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll while open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Auto-focus first focusable element
  React.useEffect(() => {
    if (!open || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      data-spark="modal-overlay"
      className="fixed inset-0 z-[var(--sprk-z-modal)] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        data-spark="modal-panel"
        className={cn(
          "relative z-10 w-full rounded-[var(--sprk-border-radius-lg)] border border-[var(--sprk-border-color)]",
          "bg-white dark:bg-[var(--sprk-color-neutral-100)] p-6",
          "shadow-[var(--sprk-shadow-lg)]",
          "animate-slide-up",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              {title && (
                <h2
                  id={titleId}
                  className="text-lg font-semibold leading-none text-slate-900 dark:text-white"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descId}
                  className="text-sm text-muted-foreground"
                >
                  {description}
                </p>
              )}
            </div>

            {!hideCloseButton && (
              <button
                type="button"
                aria-label="Close dialog"
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--sprk-color-neutral-100)] hover:text-slate-900 dark:hover:bg-[var(--sprk-color-neutral-200)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sprk-color-primary)]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div data-spark="modal-body">{children}</div>
      </div>
    </div>
  );
};

SparkModal.displayName = "SparkModal";

export { SparkModal };
