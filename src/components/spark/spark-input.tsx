import * as React from "react";
import { cn } from "@/lib/infra/utils";

/**
 * SparkInput — Spark Design System text-input wrapper.
 *
 * Wraps a native <input> with a label, optional helper text and error state.
 * All standard <input> props are forwarded to the underlying element.
 */
export interface SparkInputProps extends React.ComponentProps<"input"> {
  /** Visible label rendered above the input */
  label?: string;
  /** Auxiliary helper text shown below the input */
  helperText?: string;
  /** Error message — when provided the input renders in an error state */
  error?: string;
  /** Extra className applied to the outer wrapper */
  wrapperClassName?: string;
}

const SparkInput = React.forwardRef<HTMLInputElement, SparkInputProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      className,
      wrapperClassName,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    // Auto-generate an id when one is not provided so label + input are linked
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const hasError = Boolean(error);

    return (
      <div
        data-spark="input-wrapper"
        className={cn("flex flex-col gap-1.5", wrapperClassName)}
      >
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium leading-none",
              disabled
                ? "text-muted-foreground/60 cursor-not-allowed"
                : "text-[var(--sprk-color-neutral-700)] dark:text-[var(--sprk-color-neutral-300)]"
            )}
          >
            {label}
            {required && (
              <span
                aria-hidden="true"
                className="ml-0.5 text-[var(--sprk-color-error)]"
              >
                *
              </span>
            )}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          required={required}
          disabled={disabled}
          aria-describedby={
            [helperText ? helperId : "", hasError ? errorId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={hasError || undefined}
          data-spark="input"
          className={cn(
            "h-10 w-full min-w-0 rounded-[var(--sprk-border-radius)] border bg-transparent",
            "px-3 py-1 text-sm shadow-[var(--sprk-shadow-sm)]",
            "transition-[color,box-shadow,border-color] duration-[var(--sprk-transition-fast)] outline-none",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Normal border
            "border-[var(--sprk-border-color)]",
            // Focus ring
            "focus-visible:border-[var(--sprk-color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--sprk-color-primary)]/20",
            // Error state
            hasError &&
              "border-[var(--sprk-color-error)] ring-2 ring-[var(--sprk-color-error)]/20 focus-visible:ring-[var(--sprk-color-error)]/30",
            className
          )}
          {...props}
        />

        {hasError ? (
          <p
            id={errorId}
            role="alert"
            data-spark="input-error"
            className="text-xs font-medium text-[var(--sprk-color-error)]"
          >
            {error}
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            data-spark="input-helper"
            className="text-xs text-muted-foreground"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
SparkInput.displayName = "SparkInput";

export { SparkInput };
