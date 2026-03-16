import { motion } from "framer-motion";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-[#1641d9] focus-visible:ring-primary/40",
  secondary:
    "border border-primary text-primary hover:bg-primary/10 focus-visible:ring-primary/30",
  ghost: "text-textSecondary hover:bg-gray-100 focus-visible:ring-gray-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-5 py-3 text-lg",
};

export const Button = ({
  label,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  isLoading = false,
  disabled = false,
  type = "button",
  className = "",
}: ButtonProps) => {
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      dir="rtl"
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
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
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icon
      )}
      <span>{label}</span>
    </motion.button>
  );
};
