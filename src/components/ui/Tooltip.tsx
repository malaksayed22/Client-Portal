import { AnimatePresence, motion } from "framer-motion";
import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type TooltipVertical = "top" | "bottom";
type TooltipHorizontal = "start" | "end";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [vertical, setVertical] = useState<TooltipVertical>("bottom");
  const [horizontal, setHorizontal] = useState<TooltipHorizontal>("start");
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  const updatePlacement = () => {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidthEstimate = 260;
    const tooltipHeightEstimate = 110;

    setVertical(
      rect.bottom + tooltipHeightEstimate + viewportPadding > window.innerHeight
        ? "top"
        : "bottom",
    );

    setHorizontal(
      rect.left + tooltipWidthEstimate + viewportPadding > window.innerWidth
        ? "end"
        : "start",
    );
  };

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    const nextFocusedElement = event.relatedTarget as Node | null;
    if (
      !nextFocusedElement ||
      !event.currentTarget.contains(nextFocusedElement)
    ) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const resizeTimer = window.setTimeout(() => {
      updatePlacement();
    }, 0);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      updatePlacement();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);
    return () => {
      window.clearTimeout(resizeTimer);
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const placementClasses = [
    vertical === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
    horizontal === "start" ? "left-0" : "right-0",
  ].join(" ");

  const transformOrigin: CSSProperties = {
    transformOrigin: `${horizontal === "start" ? "left" : "right"} ${vertical === "bottom" ? "top" : "bottom"}`,
  };

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      dir="rtl"
      onMouseEnter={() => {
        updatePlacement();
        setIsOpen(true);
      }}
      onMouseLeave={() => setIsOpen(false)}
      onFocusCapture={() => {
        updatePlacement();
        setIsOpen(true);
      }}
      onBlurCapture={handleBlur}
      onKeyDown={handleKeyDown}
      aria-describedby={isOpen ? tooltipId : undefined}
    >
      {children}
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id={tooltipId}
            style={transformOrigin}
            initial={{
              opacity: 0,
              scale: 0.95,
              y: vertical === "bottom" ? -4 : 4,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: vertical === "bottom" ? -4 : 4,
            }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={[
              "absolute z-50 w-max max-w-[260px] rounded-xl border border-border bg-card p-3 text-sm text-textPrimary shadow-lg",
              "border-s-4 border-s-accent",
              placementClasses,
            ].join(" ")}
            role="tooltip"
          >
            {content}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  );
};
