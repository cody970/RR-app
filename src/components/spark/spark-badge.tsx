import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/infra/utils";

/**
 * SparkBadge — Spark Design System status badge wrapper.
 *
 * Variants: default | success | warning | error | info | outline
 */
const sparkBadgeVariants = cva(
  [
    "inline-flex items-center rounded-[var(--sprk-border-radius-full)]",
    "px-2.5 py-0.5 text-xs font-semibold",
    "transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-[var(--sprk-color-secondary)] text-white",
        success:
          "border border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
        warning:
          "border border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        error:
          "border border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
        info:
          "border border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
        primary:
          "border border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        outline:
          "border border-[var(--sprk-border-color)] bg-transparent text-[var(--sprk-color-neutral-700)] dark:text-[var(--sprk-color-neutral-300)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface SparkBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof sparkBadgeVariants> {}

const SparkBadge = React.forwardRef<HTMLSpanElement, SparkBadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      data-spark="badge"
      data-variant={variant ?? "default"}
      className={cn(sparkBadgeVariants({ variant }), className)}
      {...props}
    />
  )
);
SparkBadge.displayName = "SparkBadge";

export { SparkBadge, sparkBadgeVariants };
