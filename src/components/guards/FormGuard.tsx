import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storageService } from "../../lib/storageService";
import { useFormStore } from "../../store/formStore";

type FormGuardProps = {
  children: ReactNode;
};

const getPersistedSubmissionLock = (): boolean => {
  const identifier = storageService.getActiveIdentifier();
  if (!identifier) {
    return false;
  }

  const submission = storageService.get<{ id?: string }>(
    identifier,
    "submission",
  );
  return Boolean(submission?.id);
};

export const FormGuard = ({ children }: FormGuardProps) => {
  const navigate = useNavigate();
  const isSubmitted = useFormStore((state) => state.isSubmitted);
  const [showMessage, setShowMessage] = useState(true);

  const isLocked = useMemo(() => {
    return isSubmitted || getPersistedSubmissionLock();
  }, [isSubmitted]);

  useEffect(() => {
    if (!isLocked) {
      return;
    }

    const fadeTimer = window.setTimeout(() => {
      setShowMessage(false);
    }, 1000);

    const redirectTimer = window.setTimeout(() => {
      navigate("/tracker", { replace: true });
    }, 1500);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [isLocked, navigate]);

  if (isLocked) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background px-4"
        dir="rtl"
      >
        <AnimatePresence>
          {showMessage ? (
            <motion.p
              key="redirect-message"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card px-4 py-4 text-center text-base font-semibold text-textPrimary shadow-sm sm:px-6"
            >
              سبق وبعتّ طلبك! بنحولك لصفحة المتابعة...
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return <>{children}</>;
};
