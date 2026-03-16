import { AnimatePresence, motion } from "framer-motion";
import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ErrorBoundary } from "../components/layout/ErrorBoundary";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import { StepOne } from "../components/form/StepOne";
import { ProgressBar, type ProgressStep } from "../components/ui/ProgressBar";
import { useFormPersist } from "../hooks/useFormPersist";
import { fadeInUp, staggerContainer } from "../lib/animations";
import { storageService } from "../lib/storageService";
import { useAuthStore } from "../store/authStore";
import { useFormStore } from "../store/formStore";

const StepTwo = lazy(() =>
  import("../components/form/StepTwo").then((module) => ({
    default: module.StepTwo,
  })),
);
const StepThree = lazy(() =>
  import("../components/form/StepThree").then((module) => ({
    default: module.StepThree,
  })),
);
const StepFour = lazy(() =>
  import("../components/form/StepFour").then((module) => ({
    default: module.StepFour,
  })),
);

const iconClassName = "h-5 w-5";

const steps: ProgressStep[] = [
  {
    label: "شغلك",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClassName}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 8.5A2.5 2.5 0 015.5 6h13A2.5 2.5 0 0121 8.5v9A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 17.5v-9z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 6V4.8A1.8 1.8 0 019.8 3h4.4A1.8 1.8 0 0116 4.8V6"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    label: "هدفك",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClassName}
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "المشروع",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClassName}
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="5"
          y="5"
          width="14"
          height="4"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="5"
          y="10"
          width="14"
          height="4"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="5"
          y="15"
          width="14"
          height="4"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    label: "التفاصيل",
    icon: (
      <svg
        viewBox="0 0 20 20"
        className={iconClassName}
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.414l-7.001 7a1 1 0 01-1.414 0l-3-3A1 1 0 116.703 9.29l2.293 2.293 6.294-6.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

const trustBadges = [
  {
    label: "100+ مشروع منجز",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 12l4 4 10-10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "رد خلال 24 ساعة",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 7v5l3 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "ضمان الجودة",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 3l7 3v6c0 4.2-2.8 7.6-7 9-4.2-1.4-7-4.8-7-9V6l7-3z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentStep = useFormStore((state) => state.currentStep);
  const restoreProgress = useFormStore((state) => state.restoreProgress);
  const lockForm = useFormStore((state) => state.lockForm);
  const resetForm = useFormStore((state) => state.resetForm);
  const currentUserEmail = useAuthStore((state) => state.currentUserEmail);
  const authToken = useAuthStore((state) => state.authToken);
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  const isAuthenticated = Boolean(currentUserEmail && authToken);
  const isFormRoute = location.pathname === "/form";
  const { showAutoSaved } = useFormPersist();
  const stepContentRef = useRef<HTMLDivElement | null>(null);
  const [stepMinHeight, setStepMinHeight] = useState(0);

  useLayoutEffect(() => {
    const node = stepContentRef.current;
    if (!node) {
      return;
    }

    const updateHeight = () => {
      const nextHeight = Math.ceil(node.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setStepMinHeight((prev) => Math.max(prev, nextHeight));
      }
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [currentStep]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const identifier = storageService.getActiveIdentifier();
    if (!identifier) {
      navigate("/signin", { replace: true });
      return;
    }

    if (identifier !== currentUserEmail) {
      syncFromStorage(identifier);
    }

    const submission = storageService.get<{ id?: string }>(
      identifier,
      "submission",
    );
    const progress = storageService.get<{
      currentStep?: number;
      formData?: ReturnType<typeof useFormStore.getState>["formData"];
      savedAt?: string;
    }>(identifier, "formProgress");

    if (submission?.id) {
      lockForm(submission.id);
      if (isFormRoute) {
        navigate("/tracker", { replace: true });
      }
      return;
    }

    if (progress?.formData) {
      restoreProgress(progress);
      return;
    }

    resetForm();
  }, [
    currentUserEmail,
    isAuthenticated,
    isFormRoute,
    lockForm,
    navigate,
    resetForm,
    restoreProgress,
    syncFromStorage,
  ]);

  const renderStep = () => {
    if (currentStep === 1) {
      return <StepOne />;
    }

    if (currentStep === 2) {
      return <StepTwo />;
    }

    if (currentStep === 3) {
      return <StepThree />;
    }

    return <StepFour />;
  };

  if (!isAuthenticated) {
    return (
      <div
        className="page-container flex min-h-screen flex-col bg-background"
        dir="rtl"
      >
        <Header />

        <main className="flex-1 px-4 pb-16 pt-12 sm:px-6">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8"
          >
            <h1 className="font-heading text-3xl font-bold text-textPrimary">
              أهلاً بيك في T.Phoenix
            </h1>
            <p className="mt-3 text-textSecondary">
              سجل دخولك الأول وبعدها اضغط ابدأ مشروعك علشان تكمل الطلب.
            </p>
            <button
              type="button"
              onClick={() => navigate("/signin", { state: { from: "/start" } })}
              className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
            >
              تسجيل الدخول
            </button>
          </motion.section>
        </main>

        <Footer />
      </div>
    );
  }

  if (!isFormRoute) {
    return (
      <div
        className="page-container flex min-h-screen flex-col bg-background"
        dir="rtl"
      >
        <Header />

        <main className="flex-1 px-4 pb-16 pt-12 sm:px-6">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8"
          >
            <h1 className="font-heading text-3xl font-bold text-textPrimary">
              أهلاً بيك في T.Phoenix
            </h1>
            <p className="mt-3 text-textSecondary">
              جاهز تبدأ مشروعك؟ اضغط على الزر وابدأ تعبئة النموذج.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/start")}
                className="rounded-xl bg-primary px-6 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              >
                ابدأ مشروعك
              </button>
            </div>
          </motion.section>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div
      className="page-container flex min-h-screen flex-col bg-background"
      dir="rtl"
    >
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(27,79,255,0.08) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />

          <motion.div
            className="relative mx-auto flex w-full max-w-6xl flex-col items-center"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
              className="max-w-3xl text-center font-heading text-2xl font-bold leading-tight text-textPrimary sm:text-4xl md:text-5xl"
            >
              بنبني مواقع بتعكس شغلك الحقيقي
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
              className="mt-3 max-w-2xl text-center font-body text-sm text-textSecondary sm:mt-4 sm:text-base"
            >
              ملي النموذج ده وهنتواصل معاك في أقرب وقت عشان نبدأ مشروعك
            </motion.p>

            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.5 }}
              className="mt-10 w-full max-w-3xl"
            >
              <ProgressBar currentStep={currentStep} steps={steps} />
            </motion.div>

            <motion.section
              variants={fadeInUp}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.65 }}
              className="mt-8 w-full max-w-[760px] -mx-4 overflow-x-visible overflow-y-hidden rounded-t-2xl rounded-none bg-card p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:mx-0 sm:rounded-2xl sm:p-8 lg:max-w-[760px]"
              style={{ overflowY: "clip", scrollbarGutter: "stable" }}
            >
              <AnimatePresence>
                {showAutoSaved ? (
                  <motion.p
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="mb-3 text-sm text-success"
                  >
                    ✓ اتحفظ تلقائياً
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div className="min-h-[220px] animate-pulse rounded-xl bg-background" />
                  }
                >
                  <div
                    style={{
                      touchAction: "pan-y",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      overflow: "visible",
                      overflowX: "hidden",
                      width: "100%",
                      minHeight:
                        stepMinHeight > 0 ? `${stepMinHeight}px` : undefined,
                    }}
                  >
                    <div
                      key={currentStep}
                      ref={stepContentRef}
                      style={{ touchAction: "pan-y" }}
                    >
                      {renderStep()}
                    </div>
                  </div>
                </Suspense>
              </ErrorBoundary>
            </motion.section>

            <motion.section
              variants={fadeInUp}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.8 }}
              className="mt-6 grid w-full max-w-[760px] grid-cols-1 gap-2 text-textSecondary sm:grid-cols-3"
            >
              {trustBadges.map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-xs sm:text-sm"
                >
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              ))}
            </motion.section>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
