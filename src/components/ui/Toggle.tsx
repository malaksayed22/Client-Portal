import { motion } from "framer-motion";

export interface ToggleProps {
  labelOn: string;
  labelOff: string;
  value: boolean;
  onChange: (nextValue: boolean) => void;
}

export const Toggle = ({ labelOn, labelOff, value, onChange }: ToggleProps) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      dir="rtl"
      className={[
        "relative inline-flex h-11 w-full max-w-[280px] items-center rounded-full p-1 transition-colors duration-300 sm:w-44",
        value ? "bg-primary/15" : "bg-gray-200",
      ].join(" ")}
      role="switch"
      aria-checked={value}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 450, damping: 35 }}
        className={[
          "absolute top-1 h-9 w-[calc(50%-0.25rem)] rounded-full",
          value ? "right-1 bg-primary" : "left-1 bg-textSecondary",
        ].join(" ")}
      />
      <span className="relative z-10 flex w-full items-center justify-between px-3 text-sm font-semibold">
        <span className={value ? "text-primary" : "text-textSecondary"}>
          {labelOn}
        </span>
        <span className={!value ? "text-textSecondary" : "text-primary"}>
          {labelOff}
        </span>
      </span>
    </button>
  );
};
