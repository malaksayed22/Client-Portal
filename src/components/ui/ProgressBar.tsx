import { motion } from "framer-motion";
import { memo, type ReactNode } from "react";

export interface ProgressStep {
  label: string;
  icon: ReactNode;
}

export interface ProgressBarProps {
  currentStep: number;
  steps: ProgressStep[];
}

const ProgressBarBase = ({ currentStep, steps }: ProgressBarProps) => {
  const safeSteps = steps.slice(0, 4);
  const clampedStep = Math.max(1, Math.min(currentStep, safeSteps.length || 1));

  return (
    <div className="w-full" dir="rtl">
      <div className="flex items-center justify-center gap-2 py-2 sm:hidden">
        <span className="text-sm text-textSecondary">الخطوة</span>
        <span className="font-heading text-lg font-bold text-primary">
          {clampedStep}
        </span>
        <span className="text-sm text-textSecondary">
          من {safeSteps.length}
        </span>
      </div>

      <div className="relative flex items-start justify-between gap-2 sm:gap-3">
        {safeSteps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < clampedStep;
          const isCurrent = stepNumber === clampedStep;

          return (
            <div
              key={step.label + stepNumber}
              className="relative flex min-w-0 flex-1 flex-col items-center"
            >
              {index < safeSteps.length - 1 ? (
                <div className="absolute top-5 start-1/2 h-[3px] w-full bg-border">
                  <motion.div
                    initial={false}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="h-full bg-primary"
                  />
                </div>
              ) : null}

              <div className="relative z-10">
                <div
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-colors sm:h-9 sm:w-9 sm:text-sm",
                    isCompleted || isCurrent
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-textSecondary",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <svg
                      viewBox="0 0 20 20"
                      className="h-5 w-5"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 010 1.414l-7.001 7a1 1 0 01-1.414 0l-3-3A1 1 0 116.703 9.29l2.293 2.293 6.294-6.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>
                {isCurrent ? (
                  <span className="pointer-events-none absolute inset-0 rounded-full border border-primary/30 animate-ping" />
                ) : null}
              </div>

              <span className="mt-2 hidden w-full truncate text-center text-[11px] font-medium text-textSecondary sm:block sm:text-sm">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ProgressBar = memo(ProgressBarBase);
