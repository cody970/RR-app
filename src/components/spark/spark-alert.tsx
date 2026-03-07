import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/infra/utils";

/**
 * SparkAlert — Spark Design System notification banner.
 *
 * Variants: success | error | warning | info
 */
const sparkAlertVariants = cva(
  [
    "relative flex items-start gap-3 rounded-[var(--sprk-border-radius)] border p-4",
    "text-sm leading-snug",
  ].join(" "),
  {
    variants: {
      variant: {
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200",
        error:
          "border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-200",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200",
        info:
          "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-200",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const iconMap = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
} as const;

const iconColorMap = {
  success: "text-emerald-600 dark:text-emerald-400",
  error:   "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  info:    "text-blue-600 dark:text-blue-400",
} as const;

export interface SparkAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sparkAlertVariants> {
  /** Heading text rendered in bold above the message */
  title?: string;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback fired when the dismiss button is clicked */
  onDismiss?: () => void;
}

const SparkAlert = React.forwardRef<HTMLDivElement, SparkAlertProps>(
  (
    {
      className,
      variant = "info",
      title,
      dismissible = false,
      onDismiss,
      children,
      ...props
    },
    ref
  ) => {
    const Icon = iconMap[variant ?? "info"];
    const iconColor = iconColorMap[variant ?? "info"];

    return (
      <div
        ref={ref}
        role="alert"
        data-spark="alert"
        data-variant={variant ?? "info"}
        className={cn(sparkAlertVariants({ variant }), className)}
        {...props}
      >
        <Icon className={cn("mt-0.5 size-4 shrink-0", iconColor)} aria-hidden="true" />

        <div className="flex-1 space-y-0.5">
          {title && (
            <p className="font-semibold leading-none">{title}</p>
          )}
          {children && (
            <div className="text-sm opacity-90">{children}</div>
          )}
        </div>

        {dismissible && (
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={onDismiss}
            className="ml-auto -mr-1 -mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
);
SparkAlert.displayName = "SparkAlert";

export { SparkAlert, sparkAlertVariants };
