import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/infra/utils";

/**
 * SparkCard — Spark Design System card wrapper.
 *
 * Variants:
 *  - default     — standard catalog / neutral card
 *  - highlighted — positive metric (match rate, success)
 *  - warning     — caution / high-risk anomalies
 *  - info        — informational / estimated leakage
 */
const sparkCardVariants = cva(
  [
    "relative flex flex-col gap-4 rounded-[var(--sprk-border-radius-lg)] border bg-card",
    "py-6 text-card-foreground shadow-[var(--sprk-shadow-md)]",
    "transition-all duration-[var(--sprk-transition-slow)]",
    "hover:-translate-y-0.5",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-[var(--sprk-border-color)] hover:border-[var(--sprk-color-neutral-300)] dark:hover:border-[var(--sprk-color-neutral-600)]",
        highlighted:
          "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700",
        warning:
          "border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-700",
        info:
          "border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 hover:border-violet-300 dark:hover:border-violet-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface SparkCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sparkCardVariants> {}

const SparkCard = React.forwardRef<HTMLDivElement, SparkCardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      data-spark="card"
      data-variant={variant ?? "default"}
      className={cn(sparkCardVariants({ variant }), className)}
      {...props}
    />
  )
);
SparkCard.displayName = "SparkCard";

const SparkCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-spark="card-header"
      className={cn(
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6",
        "has-data-[spark=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
);
SparkCardHeader.displayName = "SparkCardHeader";

const SparkCardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-spark="card-title"
      className={cn("leading-none font-semibold text-[var(--sprk-font-size-sm)]", className)}
      {...props}
    />
  )
);
SparkCardTitle.displayName = "SparkCardTitle";

const SparkCardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-spark="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
SparkCardDescription.displayName = "SparkCardDescription";

const SparkCardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-spark="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
);
SparkCardAction.displayName = "SparkCardAction";

const SparkCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-spark="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
);
SparkCardContent.displayName = "SparkCardContent";

const SparkCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-spark="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  )
);
SparkCardFooter.displayName = "SparkCardFooter";

export {
  SparkCard,
  SparkCardHeader,
  SparkCardTitle,
  SparkCardDescription,
  SparkCardAction,
  SparkCardContent,
  SparkCardFooter,
  sparkCardVariants,
};
