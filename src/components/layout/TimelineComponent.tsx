import { motion } from "framer-motion";
import { memo } from "react";

export interface TimelineComponentProps {
  stages: string[];
  currentStage: number;
}

const CheckIcon = () => (
  <svg
    viewBox="0 0 20 20"
    className="h-4 w-4"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M16.704 5.29a1 1 0 010 1.414l-7.001 7a1 1 0 01-1.414 0l-3-3A1 1 0 116.703 9.29l2.293 2.293 6.294-6.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const TimelineComponentBase = ({
  stages,
  currentStage,
}: TimelineComponentProps) => {
  const safeCurrent = Math.max(0, Math.min(currentStage, stages.length - 1));

  return (
    <div className="w-full" dir="rtl">
      <div className="hidden md:block">
        <div className="relative flex items-start">
          {stages.map((stage, index) => {
            const isCompleted = index < safeCurrent;
            const isCurrent = index === safeCurrent;

            return (
              <div
                key={stage + index}
                className="relative flex flex-1 flex-col items-center"
              >
                {index < stages.length - 1 ? (
                  <div className="absolute right-1/2 top-5 h-[3px] w-full bg-border">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isCompleted ? 1 : 0 }}
                      transition={{
                        duration: 0.35,
                        ease: "easeOut",
                        delay: 0.1 * index,
                      }}
                      style={{ transformOrigin: "right" }}
                      className="h-full w-full bg-primary"
                    />
                  </div>
                ) : null}

                <div className="relative z-10">
                  <div
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-colors",
                      isCompleted || isCurrent
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-card text-textSecondary",
                    ].join(" ")}
                  >
                    {isCompleted ? <CheckIcon /> : index + 1}
                  </div>
                  {isCurrent ? (
                    <span className="pointer-events-none absolute inset-0 rounded-full border border-primary/30 animate-ping" />
                  ) : null}
                </div>

                <p
                  className={[
                    "mt-2 text-center text-xs font-medium",
                    isCompleted || isCurrent
                      ? "text-textPrimary"
                      : "text-textSecondary",
                  ].join(" ")}
                >
                  {stage}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {stages.map((stage, index) => {
          const isCompleted = index < safeCurrent;
          const isCurrent = index === safeCurrent;

          return (
            <div
              key={stage + index}
              className="relative flex items-start gap-3"
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={[
                    "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border text-sm transition-colors",
                    isCompleted || isCurrent
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-textSecondary",
                  ].join(" ")}
                >
                  {isCompleted ? <CheckIcon /> : index + 1}
                </div>
                {isCurrent ? (
                  <span className="pointer-events-none absolute left-0 top-0 h-9 w-9 rounded-full border border-primary/30 animate-ping" />
                ) : null}
                {index < stages.length - 1 ? (
                  <div className="mt-1 h-10 w-[3px] bg-border">
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: isCompleted ? 1 : 0 }}
                      transition={{
                        duration: 0.35,
                        ease: "easeOut",
                        delay: 0.1 * index,
                      }}
                      style={{ transformOrigin: "top" }}
                      className="h-full w-full bg-primary"
                    />
                  </div>
                ) : null}
              </div>
              <p
                className={[
                  "pt-2 text-sm font-medium",
                  isCompleted || isCurrent
                    ? "text-textPrimary"
                    : "text-textSecondary",
                ].join(" ")}
              >
                {stage}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TimelineComponent = memo(TimelineComponentBase);
