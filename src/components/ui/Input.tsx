import { AnimatePresence, motion } from "framer-motion";
import type {
  ChangeEvent,
  HTMLAttributes,
  HTMLInputTypeAttribute,
  ReactNode,
} from "react";
import { Tooltip } from "./Tooltip";

export interface InputProps {
  label: string;
  name: string;
  placeholder: string;
  type: HTMLInputTypeAttribute;
  value: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  tooltip?: string;
  icon?: ReactNode;
}

export const Input = ({
  label,
  name,
  placeholder,
  type,
  value,
  inputMode,
  onChange,
  onBlur,
  error,
  tooltip,
  icon,
}: InputProps) => {
  const hasError = Boolean(error);
  const isValid = value.trim().length > 0 && !hasError;
  const validationPaddingClass =
    type === "tel" ? "pe-12 sm:pe-14" : isValid ? "pe-9 sm:pe-10" : "";
  const errorId = `${name}-error`;
  const describeBy = hasError ? errorId : undefined;

  return (
    <div className="w-full" dir="rtl">
      <label
        htmlFor={name}
        className="mb-2 flex items-center justify-start gap-2 text-sm font-semibold text-textPrimary"
      >
        <span>{label}</span>
        {tooltip ? (
          <Tooltip content={tooltip}>
            <button
              type="button"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-accent transition-colors hover:bg-accent/10"
              aria-label={label}
            >
              ?
            </button>
          </Tooltip>
        ) : null}
      </label>

      <motion.div
        className="relative"
        animate={hasError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-textSecondary">
            {icon}
          </span>
        ) : null}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          inputMode={inputMode}
          onChange={onChange}
          onBlur={() => {
            onBlur?.();
          }}
          placeholder={placeholder}
          className={[
            "h-12 w-full rounded-xl border bg-card px-4 text-textPrimary shadow-sm transition-all duration-200 ease-in-out",
            "focus:outline-none focus:ring-4",
            icon ? "ps-10" : "",
            validationPaddingClass,
            hasError
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-border focus:border-primary focus:ring-primary/20",
          ].join(" ")}
          aria-label={label}
          aria-invalid={hasError}
          aria-describedby={describeBy}
        />

        {isValid ? (
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-success">
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
          </span>
        ) : null}
      </motion.div>

      <AnimatePresence>
        {hasError ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <p id={errorId} className="mt-2 text-sm text-error" role="alert">
              {error}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
