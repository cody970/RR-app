import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/infra/utils";

/**
 * SparkStepper — Spark Design System multi-step workflow indicator.
 *
 * Used for onboarding wizards and multi-step forms.
 */
export interface SparkStep {
  label: string;
  description?: string;
}

export interface SparkStepperProps {
  steps: SparkStep[];
  /** 0-based index of the currently active step */
  currentStep: number;
  /** Visual orientation */
  orientation?: "horizontal" | "vertical";
  className?: string;
}

const SparkStepper: React.FC<SparkStepperProps> = ({
  steps,
  currentStep,
  orientation = "horizontal",
  className,
}) => {
  const isHorizontal = orientation === "horizontal";

  return (
    <nav
      aria-label="Progress"
      data-spark="stepper"
      data-orientation={orientation}
      className={cn(
        isHorizontal
          ? "flex items-center gap-0"
          : "flex flex-col gap-0",
        className
      )}
    >
      <ol
        role="list"
        className={cn(
          isHorizontal
            ? "flex w-full items-center"
            : "flex flex-col gap-4"
        )}
      >
        {steps.map((step, index) => {
          const status =
            index < currentStep
              ? "complete"
              : index === currentStep
              ? "current"
              : "upcoming";

          return (
            <li
              key={step.label}
              className={cn(
                isHorizontal ? "flex flex-1 items-center" : "flex items-start gap-3"
              )}
            >
              {/* Step indicator */}
              <div className="flex items-center">
                <div
                  aria-current={status === "current" ? "step" : undefined}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-200",
                    status === "complete" &&
                      "border-[var(--sprk-color-primary)] bg-[var(--sprk-color-primary)] text-white",
                    status === "current" &&
                      "border-[var(--sprk-color-primary)] bg-white text-[var(--sprk-color-primary)] dark:bg-slate-900",
                    status === "upcoming" &&
                      "border-[var(--sprk-border-color)] bg-white text-muted-foreground dark:bg-slate-900"
                  )}
                >
                  {status === "complete" ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
              </div>

              {/* Label (horizontal: below connector; vertical: beside) */}
              {!isHorizontal && (
                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className={cn(
                      "text-sm font-medium leading-none",
                      status === "current"
                        ? "text-[var(--sprk-color-primary)]"
                        : status === "complete"
                        ? "text-slate-900 dark:text-white"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              )}

              {/* Connector line for horizontal layout (skip last) */}
              {isHorizontal && index < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "mx-2 h-0.5 flex-1 transition-colors duration-200",
                    index < currentStep
                      ? "bg-[var(--sprk-color-primary)]"
                      : "bg-[var(--sprk-border-color)]"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Horizontal step labels */}
      {isHorizontal && (
        <div
          aria-hidden="true"
          className="mt-2 grid w-full"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((step, index) => {
            const status =
              index < currentStep
                ? "complete"
                : index === currentStep
                ? "current"
                : "upcoming";

            return (
              <div key={step.label} className="flex flex-col items-center text-center">
                <span
                  className={cn(
                    "text-xs font-medium leading-none",
                    status === "current"
                      ? "text-[var(--sprk-color-primary)]"
                      : status === "complete"
                      ? "text-slate-900 dark:text-white"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
};

SparkStepper.displayName = "SparkStepper";

export { SparkStepper };
