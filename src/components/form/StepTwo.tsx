import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { slideInLeft, slideInRight } from "../../lib/animations";
import { useFormStore } from "../../store/formStore";
import type { StepTwoData } from "../../types/form.types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Tooltip } from "../ui/Tooltip";
import { Toggle } from "../ui/Toggle";

type FieldError = string | undefined;

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

const isValidUrl = (value: string) => {
  if (value.trim().length === 0) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const StepTwo = () => {
  const stepData = useFormStore((state) => state.formData.stepTwo);
  const updateStepData = useFormStore((state) => state.updateStepData);
  const nextStep = useFormStore((state) => state.nextStep);
  const prevStep = useFormStore((state) => state.prevStep);
  const navigationDirection = useFormStore(
    (state) => state.navigationDirection,
  );
  const formShakeControls = useAnimationControls();

  const defaultValues = useMemo<StepTwoData>(
    () => ({
      whyNow: stepData.whyNow,
      successDefinition: stepData.successDefinition,
      hasExistingWebsite: stepData.hasExistingWebsite,
      existingWebsiteIssues: stepData.existingWebsiteIssues,
      inspiredSites: stepData.inspiredSites,
      inspiredSitesReason: stepData.inspiredSitesReason,
      dislikedSiteUrl: stepData.dislikedSiteUrl,
      dislikedSiteReason: stepData.dislikedSiteReason,
    }),
    [stepData],
  );

  const getValidationToastMessage = (value: StepTwoData) => {
    if (value.whyNow.trim().length < 15) {
      return "من فضلك اشرح السبب في 15 حرف على الأقل";
    }
    if (value.successDefinition.trim().length === 0) {
      return "من فضلك وضح شكل النجاح بالنسبالك";
    }
    if (!isValidUrl(value.inspiredSites[0])) {
      return "من فضلك أدخل رابط صحيح يبدأ بـ http أو https";
    }
    if (!isValidUrl(value.inspiredSites[1])) {
      return "من فضلك أدخل رابط صحيح يبدأ بـ http أو https";
    }
    if (!isValidUrl(value.inspiredSites[2])) {
      return "من فضلك أدخل رابط صحيح يبدأ بـ http أو https";
    }
    if (!isValidUrl(value.dislikedSiteUrl)) {
      return "من فضلك أدخل رابط صحيح يبدأ بـ http أو https";
    }
    return "من فضلك راجع الحقول المطلوبة";
  };

  const focusFirstInvalidField = (value: StepTwoData) => {
    if (value.whyNow.trim().length < 15) {
      focusByName("whyNow");
      return;
    }
    if (value.successDefinition.trim().length === 0) {
      focusByName("successDefinition");
      return;
    }
    if (!isValidUrl(value.inspiredSites[0])) {
      focusByName("inspiredSites[0]");
      return;
    }
    if (!isValidUrl(value.inspiredSites[1])) {
      focusByName("inspiredSites[1]");
      return;
    }
    if (!isValidUrl(value.inspiredSites[2])) {
      focusByName("inspiredSites[2]");
      return;
    }
    if (!isValidUrl(value.dislikedSiteUrl)) {
      focusByName("dislikedSiteUrl");
    }
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      updateStepData("stepTwo", value);
      nextStep();
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
    updateStepData("stepTwo", form.state.values);
  }, [form.state.values, updateStepData]);

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
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <span>تمام! جاي كويس — فضل 3 خطوات</span>
        </div>
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="8"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle
                cx="12"
                cy="12"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <h2 className="font-heading text-2xl font-bold text-textPrimary">
            عايز الموقع يعمل إيه بالظبط؟
          </h2>
        </div>
        <p className="font-body text-sm text-textSecondary sm:text-base">
          فهم هدفك بيخلينا نوصلك للنتيجة الصح
        </p>
      </div>

      <motion.form
        animate={formShakeControls}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="space-y-5"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08 }}
        >
          <form.Field
            name="whyNow"
            validators={{
              onBlur: ({ value }) => {
                if (value.trim().length < 15) {
                  return "من فضلك اشرح السبب في 15 حرف على الأقل";
                }
                return undefined;
              },
              onSubmit: ({ value }) => {
                if (value.trim().length < 15) {
                  return "من فضلك اشرح السبب في 15 حرف على الأقل";
                }
                return undefined;
              },
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              return (
                <Textarea
                  label="ليه محتاج موقع دلوقتي؟"
                  name={field.name}
                  placeholder="مثلاً: عشان الناس تلاقيني أونلاين..."
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
          transition={{ duration: 0.28, delay: 0.16 }}
        >
          <form.Field
            name="successDefinition"
            validators={{
              onBlur: ({ value }) => {
                if (value.trim().length === 0) {
                  return "من فضلك وضح شكل النجاح بالنسبالك";
                }
                return undefined;
              },
              onSubmit: ({ value }) => {
                if (value.trim().length === 0) {
                  return "من فضلك وضح شكل النجاح بالنسبالك";
                }
                return undefined;
              },
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              return (
                <Textarea
                  label="الموقع ناجح إيه في نظرك؟"
                  name={field.name}
                  placeholder="مثلاً: لما يجيلي 10 عملاء جدد في الشهر..."
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={() => field.handleBlur()}
                  tooltip="ده بيساعدنا نقيس نجاح الموقع بعد ما يطلع"
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
          transition={{ duration: 0.28, delay: 0.24 }}
          className="space-y-3"
        >
          <p className="text-sm font-semibold text-textPrimary">
            عندك موقع قديم؟
          </p>
          <form.Field name="hasExistingWebsite">
            {(field) => (
              <Toggle
                labelOn="آه عندي"
                labelOff="لا معنديش"
                value={field.state.value}
                onChange={(nextValue) => field.handleChange(nextValue)}
              />
            )}
          </form.Field>

          <form.Field name="hasExistingWebsite">
            {(toggleField) => (
              <AnimatePresence initial={false}>
                {toggleField.state.value ? (
                  <motion.div
                    key="website-issues"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <form.Field name="existingWebsiteIssues">
                        {(field) => (
                          <Textarea
                            label="إيه اللي مش عاجبك فيه؟"
                            name={field.name}
                            placeholder="اكتب لنا المشاكل الحالية اللي عايز نتفاداها"
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />
                        )}
                      </form.Field>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            )}
          </form.Field>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.32 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-textPrimary">
              بعتلنا مواقع بتحبها
            </p>
            <Tooltip content="ده بيساعدنا نفهم ذوقك من غير ما توصفه بالكلام">
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
            name="inspiredSites[0]"
            validators={{
              onBlur: ({ value }) =>
                isValidUrl(value)
                  ? undefined
                  : "من فضلك أدخل رابط صحيح يبدأ بـ http أو https",
              onSubmit: ({ value }) =>
                isValidUrl(value)
                  ? undefined
                  : "من فضلك أدخل رابط صحيح يبدأ بـ http أو https",
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              return (
                <Input
                  label="الرابط الأول"
                  name={field.name}
                  type="url"
                  placeholder="https://example.com"
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

          <form.Field
            name="inspiredSites[1]"
            validators={{
              onBlur: ({ value }) =>
                isValidUrl(value)
                  ? undefined
                  : "من فضلك أدخل رابط صحيح يبدأ بـ http أو https",
              onSubmit: ({ value }) =>
                isValidUrl(value)
                  ? undefined
                  : "من فضلك أدخل رابط صحيح يبدأ بـ http أو https",
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              return (
                <Input
                  label="الرابط الثاني"
                  name={field.name}
                  type="url"
                  placeholder="https://example.com"
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

          <form.Field
            name="inspiredSites[2]"
            validators={{
              onBlur: ({ value }) =>
                isValidUrl(value)
                  ? undefined
                  : "من فضلك أدخل رابط صحيح يبدأ بـ http أو https",
              onSubmit: ({ value }) =>
                isValidUrl(value)
                  ? undefined
                  : "من فضلك أدخل رابط صحيح يبدأ بـ http أو https",
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              return (
                <Input
                  label="الرابط الثالث"
                  name={field.name}
                  type="url"
                  placeholder="https://example.com"
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

          <form.Field name="inspiredSitesReason">
            {(field) => (
              <Textarea
                label="ليه بتحب التصميم ده؟"
                name={field.name}
                placeholder="اكتب أهم الأسباب اللي جذبتك"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.4 }}
          className="space-y-3"
        >
          <p className="text-sm font-semibold text-textPrimary">
            في موقع شفته ومش عاجبك؟
          </p>
          <form.Field
            name="dislikedSiteUrl"
            validators={{
              onBlur: ({ value }) =>
                isValidUrl(value)
                  ? undefined
                  : "من فضلك أدخل رابط صحيح يبدأ بـ http أو https",
              onSubmit: ({ value }) =>
                isValidUrl(value)
                  ? undefined
                  : "من فضلك أدخل رابط صحيح يبدأ بـ http أو https",
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              return (
                <Input
                  label="رابط الموقع"
                  name={field.name}
                  type="url"
                  placeholder="https://example.com"
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

          <form.Field name="dislikedSiteReason">
            {(field) => (
              <Textarea
                label="ليه مش عاجبك؟"
                name={field.name}
                placeholder="اكتب النقاط اللي حسيت إنها ضعيفة"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>
        </motion.div>

        <div className="mt-6 flex items-center gap-3 pt-2">
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
            الخطوة 2 من 4
          </p>
          <div className="flex-1 sm:flex-none">
            <Button
              label="التالي ←"
              variant="primary"
              size="md"
              type="submit"
              className="h-11 w-full sm:h-10 sm:w-auto sm:px-8"
            />
          </div>
        </div>
      </motion.form>
    </motion.section>
  );
};
