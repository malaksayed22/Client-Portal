import { useEffect, useState } from "react";

type SyncLoaderProps = {
  active: boolean;
};

export const SyncLoader = ({ active }: SyncLoaderProps) => {
  const [mounted, setMounted] = useState(active);

  useEffect(() => {
    if (active) {
      setMounted(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setMounted(false);
    }, 260);

    return () => window.clearTimeout(timer);
  }, [active]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={[
        "fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-sm transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0",
      ].join(" ")}
      dir="rtl"
      aria-live="polite"
      aria-busy={active}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-white shadow-lg">
          CP
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary [animation-delay:0ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary/80 [animation-delay:140ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary/60 [animation-delay:280ms]" />
        </div>

        <p className="font-heading text-base font-semibold text-textPrimary">
          جاري تحميل بياناتك...
        </p>
      </div>
    </div>
  );
};
