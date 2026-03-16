import { motion } from "framer-motion";
import { memo, type ComponentType, type SVGProps } from "react";
import { Tooltip } from "./Tooltip";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface CardCheckboxProps {
  icon: string | IconComponent;
  label: string;
  description?: string;
  tooltip?: string;
  selected: boolean;
  onClick: () => void;
  multiSelect?: boolean;
  disabled?: boolean;
  locked?: boolean;
}

const renderIcon = (icon: string | IconComponent) => {
  if (typeof icon === "string") {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background sm:h-10 sm:w-10"
        dangerouslySetInnerHTML={{ __html: icon }}
      />
    );
  }

  const Icon = icon;
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background text-primary sm:h-10 sm:w-10">
      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
    </span>
  );
};

const CardCheckboxComponent = ({
  icon,
  label,
  description,
  tooltip,
  selected,
  onClick,
  multiSelect = false,
  disabled = false,
  locked = false,
}: CardCheckboxProps) => {
  return (
    <motion.button
      type="button"
      layout
      dir="rtl"
      onClick={() => {
        if (!disabled) {
          onClick();
        }
      }}
      whileHover={disabled ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={[
        "relative w-full rounded-2xl border bg-card p-3 text-right shadow-sm transition-shadow sm:p-4",
        "hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        disabled ? "cursor-not-allowed opacity-80" : "",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border hover:border-primary/40",
      ].join(" ")}
      role={multiSelect ? "checkbox" : "radio"}
      aria-checked={selected}
      aria-disabled={disabled}
    >
      <div className="flex items-start gap-3">
        {renderIcon(icon)}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-textPrimary sm:text-base">
              {label}
            </p>
            {tooltip ? (
              <Tooltip content={tooltip}>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-accent transition-colors hover:bg-accent/10">
                  ?
                </span>
              </Tooltip>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 hidden text-sm text-textSecondary sm:block">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {locked ? (
        <span className="absolute start-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 10V8a5 5 0 0110 0v2M6 10h12v9H6v-9z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ) : null}

      {selected ? (
        <span className="absolute end-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
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
        </span>
      ) : null}
    </motion.button>
  );
};

export const CardCheckbox = memo(CardCheckboxComponent);
