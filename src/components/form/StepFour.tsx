import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/axios";
import { slideInLeft, slideInRight } from "../../lib/animations";
import { storageService } from "../../lib/storageService";
import { syncService } from "../../lib/syncService";
import { useAuthStore } from "../../store/authStore";
import { useFormStore } from "../../store/formStore";
import type { StepFourData } from "../../types/form.types";
import {
  SubmissionStatus,
  type Submission,
} from "../../types/submission.types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Toggle } from "../ui/Toggle";
import { Tooltip } from "../ui/Tooltip";

type FieldError = string | undefined;

type StyleCard = {
  value: string;
  title: string;
  description: string;
  preview: "minimal" | "bold" | "warm" | "premium";
};

type SubmitResult = {
  fallback: boolean;
};

const phoneRegex = /^01[0125]\d{8}$/;
const localHosts = new Set(["localhost", "127.0.0.1"]);

const normalizeArabicDigits = (value: string) => {
  const arabicNumbers = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[٠-٩]/g, (digit) =>
    String(arabicNumbers.indexOf(digit)),
  );
};

const normalizePhone = (value: string | undefined | null) =>
  normalizeArabicDigits(value ?? "")
    .replace(/\s|-/g, "")
    .trim();

const isValidPhone = (value: string | undefined | null) =>
  phoneRegex.test(normalizePhone(value));

const isValidEmail = (value: string | undefined | null) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value ?? "").trim());

const budgetOptions = [
  "مش متحدد لسه",
  "أقل من 5,000 جنيه",
  "5,000 – 15,000 جنيه",
  "15,000 – 30,000 جنيه",
  "أكتر من 30,000 جنيه",
] as const;

const approverOptions = ["أنا بنفسي", "مدير أو شريك", "لجنة أو فريق"] as const;

const createSubmissionId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const styleCards: StyleCard[] = [
  {
    value: "minimal",
    title: "عصري ومينيمال",
    description: "تصميم نظيف وبسيط — الكلام يتكلم عن نفسه",
    preview: "minimal",
  },
  {
    value: "bold",
    title: "جريء وملون",
    description: "ألوان قوية وتصميم بيلفت النظر",
    preview: "bold",
  },
  {
    value: "warm",
    title: "دافي وودي",
    description: "إحساس قريب وبشري — مناسب للخدمات",
    preview: "warm",
  },
  {
    value: "premium",
    title: "احترافي وراقي",
    description: "للشركات والعلامات التجارية الفاخرة",
    preview: "premium",
  },
];

const getFirstError = (errors: unknown[] | undefined): FieldError => {
  if (!errors || errors.length === 0) {
    return undefined;
  }

  const firstError = errors[0];
  return typeof firstError === "string" ? firstError : undefined;
};

const focusByName = (name: string) => {
  const target = document.getElementsByName(name)[0] as
    | HTMLInputElement
    | HTMLTextAreaElement
    | undefined;

  if (!target) {
    return;
  }

  target.focus({ preventScroll: true });
};

const focusBySelector = (selector: string) => {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) {
    return;
  }

  target.focus({ preventScroll: true });
};

const StylePreview = ({ mode }: { mode: StyleCard["preview"] }) => {
  if (mode === "bold") {
    return (
      <div className="rounded-lg bg-primary p-3">
        <div className="mb-2 h-2 w-16 rounded bg-white/80" />
        <div className="h-2 w-24 rounded bg-white/50" />
      </div>
    );
  }

  if (mode === "warm") {
    return (
      <div className="rounded-lg bg-[#FDF6EC] p-3">
        <div className="mb-2 h-2 w-20 rounded bg-[#d5b99a]" />
        <div className="h-2 w-14 rounded bg-[#e8ceb2]" />
      </div>
    );
  }

  if (mode === "premium") {
    return (
      <div className="rounded-lg bg-textPrimary p-3">
        <div className="mb-2 h-2 w-20 rounded bg-white/80" />
        <div className="h-2 w-16 rounded bg-white/40" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 h-2 w-20 rounded bg-gray-300" />
      <div className="h-2 w-14 rounded bg-gray-200" />
    </div>
  );
};

export const StepFour = () => {
  const navigate = useNavigate();
  const currentUserEmail = useAuthStore((state) => state.currentUserEmail);
  const formData = useFormStore((state) => state.formData);
  const stepData = useFormStore((state) => state.formData.stepFour);
  const isSubmitted = useFormStore((state) => state.isSubmitted);
  const updateStepData = useFormStore((state) => state.updateStepData);
  const lockForm = useFormStore((state) => state.lockForm);
  const setTrackerPhone = useFormStore((state) => state.setTrackerPhone);
  const prevStep = useFormStore((state) => state.prevStep);
  const navigationDirection = useFormStore(
    (state) => state.navigationDirection,
  );
  const formShakeControls = useAnimationControls();

  const defaultValues = useMemo<StepFourData>(
    () => ({
      budget: stepData.budget ?? "",
      hasDeadline: stepData.hasDeadline ?? false,
      deadlineDate: stepData.deadlineDate ?? "",
      deadlineReason: stepData.deadlineReason ?? "",
      approver: stepData.approver ?? "",
      phone: stepData.phone ?? "",
      email: stepData.email ?? "",
      additionalNotes: stepData.additionalNotes ?? "",
      stylePreferences: stepData.stylePreferences ?? [],
    }),
    [stepData],
  );

  const getValidationToastMessage = (value: StepFourData) => {
    if (value.budget.trim().length === 0) {
      return "اختار الميزانية التقريبية";
    }
    if (value.hasDeadline && value.deadlineDate.trim().length === 0) {
      return "اختار تاريخ التسليم";
    }
    if (value.approver.trim().length === 0) {
      return "اختار الشخص المسؤول عن القرار";
    }
    if (!isValidPhone(value.phone)) {
      return "اكتب رقم تليفون صحيح";
    }
    if (!isValidEmail(value.email)) {
      return "اكتب بريد إلكتروني صحيح";
    }
    if (value.stylePreferences.length === 0) {
      return "اختار ستايل واحد على الأقل";
    }
    return "من فضلك راجع الحقول المطلوبة";
  };

  const focusFirstInvalidField = (value: StepFourData) => {
    if (value.budget.trim().length === 0) {
      focusBySelector('[data-field="budget"] button');
      return;
    }
    if (value.hasDeadline && value.deadlineDate.trim().length === 0) {
      focusByName("deadlineDate");
      return;
    }
    if (value.approver.trim().length === 0) {
      focusBySelector('[data-field="approver"] button');
      return;
    }
    if (!isValidPhone(value.phone)) {
      focusByName("phone");
      return;
    }
    if (!isValidEmail(value.email)) {
      focusByName("email");
      return;
    }
    if (value.stylePreferences.length === 0) {
      focusBySelector('[data-field="stylePreferences"] button');
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (payload: typeof formData): Promise<SubmitResult> => {
      const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").trim();
      const currentHost =
        typeof window !== "undefined" ? window.location.hostname : "";
      const isRemoteHost = currentHost ? !localHosts.has(currentHost) : true;
      const pointsToLocalApi = /localhost|127\.0\.0\.1/i.test(apiBaseUrl);

      // On deployed clients, a localhost API URL is unreachable, so keep
      // the form working by storing the submission locally.
      if (!apiBaseUrl || (isRemoteHost && pointsToLocalApi)) {
        return { fallback: true };
      }

      try {
        await apiClient.post("/submissions", payload);
        return { fallback: false };
      } catch (error) {
        const isRecoverableNetworkError =
          axios.isAxiosError(error) &&
          (!error.response || error.code === "ECONNABORTED");

        if (isRecoverableNetworkError) {
          return { fallback: true };
        }

        // Backend validation/server issues should not block users from
        // completing the request in this local-storage-first app.
        return { fallback: true };
      }
    },
    onMutate: () => undefined,
    onError: () => {
      toast.error("حصل خطأ — حاول تاني");
    },
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const payload = {
        ...formData,
        stepFour: value,
      };

      updateStepData("stepFour", value);

      const result = await submitMutation.mutateAsync(payload);
      if (result.fallback) {
        toast.success("تم استلام الطلب في وضع التطوير");
      }

      const submissionDraft: Submission = {
        id: createSubmissionId(),
        submittedAt: new Date().toISOString(),
        status: SubmissionStatus.RECEIVED,
        currentStage: 0,
        estimatedDelivery: null,
        clientName: payload.stepOne.name,
        businessName: payload.stepOne.businessName,
        businessDescription: payload.stepOne.businessDescription,
        customerType: payload.stepOne.customerType,
        uniqueValue: payload.stepOne.uniqueValue,
        whyNow: payload.stepTwo.whyNow,
        successDefinition: payload.stepTwo.successDefinition,
        hasExistingWebsite: payload.stepTwo.hasExistingWebsite,
        existingWebsiteFeedback:
          payload.stepTwo.existingWebsiteIssues.trim().length > 0
            ? payload.stepTwo.existingWebsiteIssues
            : null,
        inspiredSites: payload.stepTwo.inspiredSites.filter(
          (site) => site.trim().length > 0,
        ),
        inspiredSitesFeedback:
          payload.stepTwo.inspiredSitesReason.trim().length > 0
            ? payload.stepTwo.inspiredSitesReason
            : null,
        dislikedSite:
          payload.stepTwo.dislikedSiteUrl.trim().length > 0
            ? payload.stepTwo.dislikedSiteUrl
            : null,
        dislikedSiteFeedback:
          payload.stepTwo.dislikedSiteReason.trim().length > 0
            ? payload.stepTwo.dislikedSiteReason
            : null,
        pages: payload.stepThree.pages,
        features: payload.stepThree.features,
        contentResponsibility: payload.stepThree.contentResponsibility,
        hasBrandAssets: payload.stepThree.hasBrandAssets,
        brandAssetsFiles: payload.stepThree.brandAssetNames,
        budget: value.budget,
        hasDeadline: value.hasDeadline,
        deadline:
          value.hasDeadline && value.deadlineDate ? value.deadlineDate : null,
        deadlineReason:
          value.hasDeadline && value.deadlineReason.trim().length > 0
            ? value.deadlineReason
            : null,
        approver: value.approver,
        phone: normalizePhone(value.phone),
        additionalNotes:
          value.additionalNotes.trim().length > 0
            ? value.additionalNotes
            : null,
        stylePreferences: value.stylePreferences,
      };

      const activeIdentifier =
        storageService.getActiveIdentifier() ?? currentUserEmail;
      if (!activeIdentifier) {
        toast.error("مش لاقيين الحساب النشط، سجل دخول تاني");
        return;
      }

      await syncService.saveSubmission(activeIdentifier, submissionDraft);
      const savedSubmission =
        (await syncService.getSubmission(activeIdentifier)) ?? submissionDraft;

      lockForm(savedSubmission.id);
      setTrackerPhone(savedSubmission.phone);

      window.history.replaceState(null, "", "/submitted");
      navigate("/submitted", {
        replace: true,
        state: { submissionId: savedSubmission.id },
      });
    },
    onSubmitInvalid: async () => {
      const currentValues = form.state.values;
      toast.error(getValidationToastMessage(currentValues));
      focusFirstInvalidField(currentValues);
      await formShakeControls.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.35, ease: "easeOut" },
      });
    },
  });

  const submissionAttempts = form.state.submissionAttempts;

  useEffect(() => {
    updateStepData("stepFour", form.state.values);
  }, [form.state.values, updateStepData]);

  useEffect(() => {
    if (isSubmitted) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSubmitted]);

  return (
    <motion.section
      variants={navigationDirection === "backward" ? slideInLeft : slideInRight}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full"
      dir="rtl"
      drag={false}
      dragConstraints={false}
      onPan={undefined}
      onDrag={undefined}
      onDragStart={undefined}
      onDragEnd={undefined}
      style={{ touchAction: "pan-y" }}
    >
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
          <span>آخر خطوة! إنت قريب جداً</span>
        </div>
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 19V5h14l-4 5 4 5H5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="font-heading text-2xl font-bold text-textPrimary">
            آخر خطوة — التفاصيل العملية
          </h2>
        </div>
        <p className="font-body text-sm text-textSecondary sm:text-base">
          وبعدين هنتواصل معاك في أقرب وقت
        </p>
      </div>

      <motion.form
        animate={formShakeControls}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="space-y-6"
      >
        <section className="space-y-4">
          <h3 className="font-heading text-lg font-bold text-textPrimary">
            التفاصيل العملية
          </h3>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.08 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-textPrimary">
                ميزانيتك التقريبية؟
              </p>
              <Tooltip content="مش لازم تبقى دقيقة — بس بتساعدنا نقترح الحل الأنسب ليك">
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-accent transition-colors hover:bg-accent/10"
                  aria-label="معلومة إضافية"
                >
                  ?
                </button>
              </Tooltip>
            </div>

            <form.Field
              name="budget"
              validators={{
                onChange: ({ value }) =>
                  value.trim().length === 0
                    ? "اختار الميزانية التقريبية"
                    : undefined,
                onSubmit: ({ value }) =>
                  value.trim().length === 0
                    ? "اختار الميزانية التقريبية"
                    : undefined,
              }}
            >
              {(field) => {
                const showError =
                  field.state.meta.isTouched || submissionAttempts > 0;
                const errorText = showError
                  ? getFirstError(field.state.meta.errors)
                  : undefined;

                return (
                  <>
                    <div className="flex flex-wrap gap-2" data-field="budget">
                      {budgetOptions.map((option) => {
                        const selected = field.state.value === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => field.handleChange(option)}
                            className={[
                              "w-[calc(50%-0.25rem)] rounded-full border px-4 py-2 text-sm transition-colors sm:w-auto",
                              selected
                                ? "border-primary bg-primary text-white"
                                : "border-border bg-card text-textSecondary hover:border-primary/40",
                            ].join(" ")}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    <AnimatePresence>
                      {errorText ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-2 text-sm text-error">{errorText}</p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </>
                );
              }}
            </form.Field>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.16 }}
            className="space-y-3"
          >
            <p className="text-sm font-semibold text-textPrimary">
              عندك تاريخ تسليم معين؟
            </p>
            <form.Field name="hasDeadline">
              {(field) => (
                <Toggle
                  labelOn="آه عندي"
                  labelOff="لا معنديش"
                  value={field.state.value}
                  onChange={(nextValue) => {
                    field.handleChange(nextValue);
                    if (!nextValue) {
                      form.setFieldValue("deadlineDate", "");
                      form.setFieldValue("deadlineReason", "");
                    }
                  }}
                />
              )}
            </form.Field>

            <form.Field name="hasDeadline">
              {(toggleField) => (
                <AnimatePresence initial={false}>
                  {toggleField.state.value ? (
                    <motion.div
                      key="deadline-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <form.Field
                        name="deadlineDate"
                        validators={{
                          onChange: ({ value }) =>
                            value.trim().length === 0 && toggleField.state.value
                              ? "اختار تاريخ التسليم"
                              : undefined,
                          onSubmit: ({ value }) =>
                            value.trim().length === 0 && toggleField.state.value
                              ? "اختار تاريخ التسليم"
                              : undefined,
                        }}
                      >
                        {(field) => {
                          const showError =
                            field.state.meta.isTouched ||
                            submissionAttempts > 0;
                          return (
                            <>
                              <label
                                htmlFor="deadlineDate"
                                className="text-sm font-semibold text-textPrimary"
                              >
                                تاريخ التسليم
                              </label>
                              <input
                                id="deadlineDate"
                                name={field.name}
                                type="date"
                                value={field.state.value}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                                className="mt-1 h-12 w-full rounded-xl border border-border bg-card px-4 text-textPrimary shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                              />
                              <AnimatePresence>
                                {showError &&
                                getFirstError(field.state.meta.errors) ? (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <p className="mt-2 text-sm text-error">
                                      {getFirstError(field.state.meta.errors)}
                                    </p>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </>
                          );
                        }}
                      </form.Field>

                      <form.Field name="deadlineReason">
                        {(field) => (
                          <Textarea
                            label="في مناسبة أو سبب معين؟"
                            name={field.name}
                            placeholder="اكتب سبب الموعد لو حابب"
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />
                        )}
                      </form.Field>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              )}
            </form.Field>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.24 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-textPrimary">
                مين اللي هيوافق على الموقع في النهاية؟
              </p>
              <Tooltip content="ده بيساعدنا نعرف مين المسؤول عن القرارات">
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-accent transition-colors hover:bg-accent/10"
                  aria-label="معلومة إضافية"
                >
                  ?
                </button>
              </Tooltip>
            </div>

            <form.Field
              name="approver"
              validators={{
                onChange: ({ value }) =>
                  value.trim().length === 0
                    ? "اختار الشخص المسؤول عن القرار"
                    : undefined,
                onSubmit: ({ value }) =>
                  value.trim().length === 0
                    ? "اختار الشخص المسؤول عن القرار"
                    : undefined,
              }}
            >
              {(field) => {
                const showError =
                  field.state.meta.isTouched || submissionAttempts > 0;
                const errorText = showError
                  ? getFirstError(field.state.meta.errors)
                  : undefined;

                return (
                  <>
                    <div
                      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                      data-field="approver"
                    >
                      {approverOptions.map((option) => {
                        const selected = field.state.value === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => field.handleChange(option)}
                            className={[
                              "rounded-xl border px-3 py-3 text-sm transition-colors",
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-textSecondary hover:border-primary/40",
                            ].join(" ")}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {errorText ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-2 text-sm text-error">{errorText}</p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </>
                );
              }}
            </form.Field>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.32 }}
          >
            <form.Field
              name="phone"
              validators={{
                onBlur: ({ value }) =>
                  isValidPhone(value) ? undefined : "اكتب رقم تليفون صحيح",
                onChange: ({ value }) =>
                  isValidPhone(value) ? undefined : "اكتب رقم تليفون صحيح",
                onSubmit: ({ value }) =>
                  isValidPhone(value) ? undefined : "اكتب رقم تليفون صحيح",
              }}
            >
              {(field) => {
                const showError =
                  field.state.meta.isTouched || submissionAttempts > 0;
                return (
                  <Input
                    label="رقم تليفونك"
                    name={field.name}
                    placeholder="مثلاً: 01xxxxxxxxx"
                    type="tel"
                    inputMode="tel"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={() => field.handleBlur()}
                    error={
                      showError
                        ? getFirstError(field.state.meta.errors)
                        : undefined
                    }
                  />
                );
              }}
            </form.Field>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.36 }}
          >
            <form.Field
              name="email"
              validators={{
                onBlur: ({ value }) =>
                  isValidEmail(value) ? undefined : "اكتب بريد إلكتروني صحيح",
                onChange: ({ value }) =>
                  isValidEmail(value) ? undefined : "اكتب بريد إلكتروني صحيح",
                onSubmit: ({ value }) =>
                  isValidEmail(value) ? undefined : "اكتب بريد إلكتروني صحيح",
              }}
            >
              {(field) => {
                const showError =
                  field.state.meta.isTouched || submissionAttempts > 0;
                return (
                  <Input
                    label="البريد الإلكتروني"
                    name={field.name}
                    placeholder="example@email.com"
                    type="email"
                    inputMode="email"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={() => field.handleBlur()}
                    error={
                      showError
                        ? getFirstError(field.state.meta.errors)
                        : undefined
                    }
                  />
                );
              }}
            </form.Field>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.4 }}
          >
            <form.Field name="additionalNotes">
              {(field) => (
                <Textarea
                  label="ملاحظات إضافية (اختياري)"
                  name={field.name}
                  placeholder="لو فيه أي تفاصيل إضافية مش موجودة في الأسئلة، اكتبها هنا"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </form.Field>
          </motion.div>
        </section>

        <section className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.4 }}
          >
            <h3 className="font-heading text-lg font-bold text-textPrimary">
              عايز الموقع يبقى شكله إزاي؟
            </h3>
            <p className="text-sm text-textSecondary">
              اختار الستايل اللي بيعجبك — أو أكتر من واحد
            </p>
          </motion.div>

          <form.Field
            name="stylePreferences"
            validators={{
              onChange: ({ value }) =>
                value.length > 0 ? undefined : "اختار ستايل واحد على الأقل",
              onSubmit: ({ value }) =>
                value.length > 0 ? undefined : "اختار ستايل واحد على الأقل",
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              const errorText = showError
                ? getFirstError(field.state.meta.errors)
                : undefined;

              const toggleStyle = (value: string) => {
                const exists = field.state.value.includes(value);
                const nextValue = exists
                  ? field.state.value.filter((item) => item !== value)
                  : [...field.state.value, value];

                field.handleChange(nextValue);
              };

              return (
                <>
                  <div
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    data-field="stylePreferences"
                  >
                    {styleCards.map((card) => {
                      const selected = field.state.value.includes(card.value);

                      return (
                        <motion.button
                          key={card.value}
                          type="button"
                          onClick={() => toggleStyle(card.value)}
                          whileHover={{ y: -3 }}
                          className={[
                            "relative overflow-hidden rounded-2xl border p-4 text-right transition-colors",
                            selected
                              ? "border-accent ring-2 ring-accent/25"
                              : "border-border hover:border-accent/40",
                            card.preview === "bold"
                              ? "bg-primary text-white"
                              : card.preview === "warm"
                                ? "bg-[#FDF6EC] text-textPrimary"
                                : card.preview === "premium"
                                  ? "bg-textPrimary text-white"
                                  : "bg-card text-textPrimary",
                          ].join(" ")}
                        >
                          {selected ? (
                            <span className="absolute end-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
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
                          <p className="text-base font-semibold">
                            {card.title}
                          </p>
                          <p className="mt-1 text-sm opacity-90">
                            {card.description}
                          </p>
                          <div className="mt-3">
                            <StylePreview mode={card.preview} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {errorText ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-2 text-sm text-error">{errorText}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </>
              );
            }}
          </form.Field>
        </section>

        <div className="mt-6 flex items-center gap-3">
          <div className="w-20 sm:w-auto">
            <Button
              label="→ السابق"
              variant="secondary"
              size="md"
              type="button"
              onClick={prevStep}
              className="h-11 w-full sm:h-10 sm:w-auto sm:px-6"
            />
          </div>
          <p className="text-center text-sm text-textSecondary">
            الخطوة 4 من 4
          </p>
          <div className="flex-1" />
        </div>

        <motion.button
          type="submit"
          whileHover={{
            scale: 1.01,
            boxShadow: "0 0 0 8px rgba(255,107,53,0.18)",
          }}
          animate={{ boxShadow: "0 0 0 0 rgba(255,107,53,0.35)" }}
          transition={{ duration: 0.2 }}
          className="h-[52px] w-full rounded-2xl bg-accent px-5 text-base font-bold text-white sm:h-12"
          disabled={submitMutation.isPending}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {submitMutation.isPending ? (
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  className="opacity-25"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-90"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : null}
            ابعت طلبك — هنتواصل معاك قريباً
          </span>
        </motion.button>
      </motion.form>
    </motion.section>
  );
};
