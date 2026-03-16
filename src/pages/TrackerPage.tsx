import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { TimelineComponent } from "../components/layout/TimelineComponent";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { parseIdentifier } from "../lib/buildIdentifier";
import {
  getLastSubmissionPhone,
  getSubmission,
} from "../lib/submissionStorage";
import { storageService } from "../lib/storageService";
import { getWhatsAppMeta } from "../lib/whatsapp";
import { fadeInUp, slideInRight } from "../lib/animations";
import { useAuthStore } from "../store/authStore";
import { useFormStore } from "../store/formStore";
import { SubmissionStatus, type Submission } from "../types/submission.types";

const timelineStages = [
  SubmissionStatus.RECEIVED,
  SubmissionStatus.REVIEWING,
  SubmissionStatus.DESIGNING,
  SubmissionStatus.BUILDING,
  SubmissionStatus.DELIVERED,
];

const trackerPhoneRegex = /^01[0125]\d{8}$/;

const normalizeArabicDigits = (value: string) => {
  const arabicNumbers = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[٠-٩]/g, (digit) =>
    String(arabicNumbers.indexOf(digit)),
  );
};

const normalizePhone = (value: string) =>
  normalizeArabicDigits(value).replace(/\s|-/g, "").trim();

const isValidTrackerPhone = (value: string) =>
  trackerPhoneRegex.test(normalizePhone(value));

const maskPhone = (phone: string) => {
  const normalized = normalizePhone(phone);
  if (normalized.length < 4) {
    return normalized;
  }

  return `${normalized.slice(0, 2)}*******${normalized.slice(-2)}`;
};

const statusBanner = (stage: number) => {
  if (stage <= 0) {
    return {
      className: "border-blue-200 bg-blue-50 text-blue-800",
      text: "استلمنا طلبك وبنراجعه دلوقتي",
    };
  }

  if (stage === 1) {
    return {
      className: "border-orange-200 bg-orange-50 text-orange-800",
      text: "بنراجع كل التفاصيل",
    };
  }

  if (stage === 2) {
    return {
      className: "border-violet-200 bg-violet-50 text-violet-800",
      text: "فريقنا شغال على التصميم",
    };
  }

  if (stage === 3) {
    return {
      className: "border-teal-200 bg-teal-50 text-teal-800",
      text: "بنبني الموقع دلوقتي",
    };
  }

  return {
    className: "border-green-200 bg-green-50 text-green-800",
    text: "مبروك! موقعك جاهز",
  };
};

const formatDate = (value: string) => {
  return new Date(value).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const TrackerPage = () => {
  const navigate = useNavigate();
  const currentUserEmail = useAuthStore((state) => state.currentUserEmail);
  const authUser = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  const trackerPhoneFromStore = useFormStore((state) => state.trackerPhone);
  const initialPhone = getLastSubmissionPhone() ?? trackerPhoneFromStore ?? "";
  const [phone, setPhone] = useState(initialPhone);
  const [submittedPhone, setSubmittedPhone] = useState(
    initialPhone ? normalizePhone(initialPhone) : "",
  );
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    business: false,
    goals: false,
    content: false,
    logistics: false,
  });
  const { hasValidWaNumber, waHref } = getWhatsAppMeta();

  const projectQuery = useQuery({
    queryKey: ["project-status", submittedPhone],
    queryFn: () => Promise.resolve(getSubmission(submittedPhone)),
    enabled: submittedPhone.trim().length > 0,
  });

  useEffect(() => {
    const activeIdentifier = storageService.getActiveIdentifier();
    if (!activeIdentifier) {
      navigate("/signin", { replace: true });
      return;
    }

    const isGoogle = parseIdentifier(activeIdentifier).method === "google";
    if (isGoogle) {
      const googleData = storageService.get(activeIdentifier, "googleData");
      if (!googleData) {
        signOut();
        navigate("/signin", { replace: true });
      }
      return;
    }

    const expectedIdentifier = currentUserEmail || authUser?.email || "";
    if (expectedIdentifier !== activeIdentifier) {
      syncFromStorage(activeIdentifier);
    }
  }, [authUser?.email, currentUserEmail, navigate, signOut, syncFromStorage]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidTrackerPhone(phone)) {
      setPhoneError("اكتب رقم تليفون صحيح");
      setSubmittedPhone("");
      return;
    }

    setPhoneError(undefined);
    setSubmittedPhone(normalizePhone(phone));
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const submission = projectQuery.data as Submission | null;
  const notFound =
    projectQuery.isSuccess && !submission && submittedPhone.length > 0;
  const banner = submission ? statusBanner(submission.currentStage) : null;

  const copySubmissionId = async () => {
    if (!submission?.id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(submission.id);
      toast.success("اتنسخ!");
    } catch {
      toast.error("ماعرفناش ننسخ الرقم");
    }
  };

  const summaryItems = useMemo(
    () => [
      { label: "الاسم", value: submission?.clientName ?? "-" },
      { label: "اسم المشروع", value: submission?.businessName ?? "-" },
      {
        label: "رقم التليفون",
        value: submission ? maskPhone(submission.phone) : "-",
      },
    ],
    [submission],
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header showProfileShortcut />

      <main className="mx-auto w-full max-w-5xl px-4 pb-14 pt-10 sm:px-6">
        <motion.section
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8"
        >
          <h1 className="font-heading text-3xl font-bold text-textPrimary">
            تابع مشروعك
          </h1>
          <p className="mt-2 text-textSecondary">
            ادخل رقم تليفونك اللي بعتيه في الطلب
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Input
                label="رقم التليفون"
                name="trackerPhone"
                placeholder="مثلاً: 01xxxxxxxxx"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  if (phoneError) {
                    setPhoneError(undefined);
                  }
                }}
                error={phoneError}
              />
            </div>
            <Button type="submit" label="ابحث" variant="primary" size="md" />
          </form>

          {projectQuery.isLoading ? (
            <div className="mt-6 space-y-3" aria-label="loading-skeleton">
              <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-gray-200" />
            </div>
          ) : null}

          {projectQuery.isError ? (
            <p className="mt-5 rounded-xl border border-error/20 bg-error/5 p-3 text-sm text-error">
              حصل خطأ أثناء التحميل
            </p>
          ) : null}

          {notFound ? (
            <p className="mt-5 rounded-xl border border-border bg-background p-3 text-sm text-textSecondary">
              مش لاقيين رقمك
            </p>
          ) : null}
        </motion.section>

        {submission ? (
          <motion.section
            variants={slideInRight}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8"
          >
            <div className="rounded-xl border border-border bg-background p-4">
              <h2 className="font-heading text-2xl font-bold text-textPrimary">
                ملخص الطلب
              </h2>
              <div className="mt-3 space-y-2 text-sm">
                {summaryItems.map((item) => (
                  <p key={item.label} className="text-textPrimary">
                    <span className="font-semibold">{item.label}:</span>{" "}
                    {item.value}
                  </p>
                ))}
                <p className="text-textPrimary">
                  <span className="font-semibold">اتبعت يوم:</span>{" "}
                  {formatDate(submission.submittedAt)}
                </p>
                <div className="pt-1">
                  <p className="text-textPrimary">
                    <span className="font-semibold">رقم طلبك:</span>
                  </p>
                  <button
                    type="button"
                    onClick={copySubmissionId}
                    className="mt-2 inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:border-primary/40"
                  >
                    {submission.id}
                  </button>
                  <p className="mt-2 text-xs text-textSecondary">
                    احتفظ برقم الطلب ده — هتحتاجه لو حبيت تتابع من جهاز تاني
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <TimelineComponent
                stages={timelineStages}
                currentStage={submission.currentStage}
              />
            </div>

            <div className="mt-6 space-y-3">
              {[
                {
                  key: "business",
                  title: "تفاصيل شغلك",
                  content: (
                    <div className="space-y-2 text-sm text-textPrimary">
                      <p>{submission.businessDescription}</p>
                      <p>
                        نوع العملاء: {submission.customerType.join("، ") || "-"}
                      </p>
                      <p>نقطة التميز: {submission.uniqueValue || "-"}</p>
                    </div>
                  ),
                },
                {
                  key: "goals",
                  title: "هدف الموقع",
                  content: (
                    <div className="space-y-2 text-sm text-textPrimary">
                      <p>{submission.whyNow}</p>
                      <p>{submission.successDefinition}</p>
                    </div>
                  ),
                },
                {
                  key: "content",
                  title: "محتوى الموقع",
                  content: (
                    <div className="space-y-3 text-sm text-textPrimary">
                      <div>
                        <p className="mb-1 font-semibold">الصفحات</p>
                        <div className="flex flex-wrap gap-2">
                          {submission.pages.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-border bg-card px-3 py-1 text-xs"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 font-semibold">الخصائص</p>
                        <div className="flex flex-wrap gap-2">
                          {submission.features.length > 0 ? (
                            submission.features.map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-border bg-card px-3 py-1 text-xs"
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <span className="text-textSecondary">-</span>
                          )}
                        </div>
                      </div>
                      <p>
                        مسؤول المحتوى: {submission.contentResponsibility || "-"}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "logistics",
                  title: "التفاصيل العملية",
                  content: (
                    <div className="space-y-2 text-sm text-textPrimary">
                      <p>الميزانية: {submission.budget}</p>
                      <p>
                        ميعاد التسليم:{" "}
                        {submission.deadline
                          ? formatDate(submission.deadline)
                          : "-"}
                      </p>
                      <p>المسؤول عن القرار: {submission.approver}</p>
                      <p>
                        الستايل: {submission.stylePreferences.join("، ") || "-"}
                      </p>
                      <p>ملاحظات إضافية: {submission.additionalNotes || "-"}</p>
                    </div>
                  ),
                },
              ].map((section) => {
                const isExpanded = Boolean(expandedSections[section.key]);

                return (
                  <div
                    key={section.key}
                    className="rounded-xl border border-border bg-background"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className="flex w-full items-center justify-between px-4 py-3 text-right"
                    >
                      <span className="font-semibold text-textPrimary">
                        {section.title}
                      </span>
                      <motion.svg
                        viewBox="0 0 20 20"
                        className="h-5 w-5 text-textSecondary"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 8l5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border px-4 py-3">
                            {section.content}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {banner ? (
              <div
                className={[
                  "mt-6 rounded-xl border p-4 text-sm font-semibold",
                  banner.className,
                ].join(" ")}
              >
                {banner.text}
              </div>
            ) : null}

            <a
              href={waHref}
              target={hasValidWaNumber ? "_blank" : undefined}
              rel={hasValidWaNumber ? "noreferrer" : undefined}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/30"
              aria-disabled={!hasValidWaNumber}
              onClick={(event) => {
                if (!hasValidWaNumber) {
                  event.preventDefault();
                }
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.52 3.48A11.82 11.82 0 0012.08 0C5.5 0 .17 5.33.17 11.91c0 2.1.55 4.16 1.6 5.97L0 24l6.28-1.64a11.86 11.86 0 005.8 1.48h.01c6.58 0 11.91-5.33 11.91-11.91a11.8 11.8 0 00-3.48-8.45zM12.09 21.8a9.9 9.9 0 01-5.04-1.37l-.36-.21-3.73.97.99-3.63-.24-.38a9.86 9.86 0 01-1.51-5.28c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 012.9 6.99c0 5.46-4.44 9.9-9.9 9.9zm5.43-7.43c-.3-.15-1.78-.88-2.06-.98-.27-.1-.47-.15-.67.15s-.77.98-.95 1.18c-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.51-1.79-1.69-2.09-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.08-.8.37s-1.05 1.03-1.05 2.52c0 1.48 1.08 2.92 1.23 3.12.15.2 2.13 3.25 5.15 4.56.72.31 1.28.5 1.72.64.72.23 1.37.2 1.88.12.57-.08 1.78-.73 2.04-1.43.25-.7.25-1.31.17-1.43-.08-.12-.27-.2-.57-.35z" />
              </svg>
              تواصل معانا على واتساب
            </a>
          </motion.section>
        ) : null}
      </main>
    </div>
  );
};

export default TrackerPage;
