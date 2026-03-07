import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/infra/utils";

/**
 * SparkButton — Spark Design System button wrapper.
 *
 * Variants: primary | secondary | tertiary | danger
 * Sizes:    sm | default | lg
 */
const sparkButtonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--sprk-border-radius)]",
    "text-sm font-semibold whitespace-nowrap",
    "transition-all duration-[var(--sprk-transition-base)] outline-none",
    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--sprk-color-primary)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--sprk-color-primary)] text-white hover:bg-[var(--sprk-color-primary-dark)] shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5",
        secondary:
          "bg-[var(--sprk-color-secondary)] text-white hover:bg-slate-700 shadow-sm hover:-translate-y-0.5",
        tertiary:
          "border border-[var(--sprk-border-color)] bg-transparent text-slate-700 dark:text-slate-200 hover:bg-[var(--sprk-color-neutral-100)] dark:hover:bg-[var(--sprk-color-neutral-100)] shadow-sm",
        danger:
          "bg-[var(--sprk-color-error)] text-white hover:bg-red-700 shadow-sm hover:-translate-y-0.5",
        ghost:
          "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-[var(--sprk-color-neutral-100)] dark:hover:bg-[var(--sprk-color-neutral-200)]",
        link:
          "bg-transparent text-[var(--sprk-color-primary)] underline-offset-4 hover:underline p-0 h-auto shadow-none",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-5",
        lg: "h-12 px-7 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface SparkButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof sparkButtonVariants> {
  asChild?: boolean;
  /** Shows a spinner and disables the button when true */
  loading?: boolean;
}

const SparkButton = React.forwardRef<HTMLButtonElement, SparkButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";

    return (
      <Comp
        ref={ref}
        data-spark="button"
        data-variant={variant ?? "primary"}
        data-size={size ?? "default"}
        className={cn(sparkButtonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2" aria-label="Loading">
            <svg
              className="size-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
SparkButton.displayName = "SparkButton";

export { SparkButton, sparkButtonVariants };
