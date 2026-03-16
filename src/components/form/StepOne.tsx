import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { slideInLeft, slideInRight } from "../../lib/animations";
import { useFormStore } from "../../store/formStore";
import type { StepOneData } from "../../types/form.types";
import { Button } from "../ui/Button";
import { CardCheckbox } from "../ui/CardCheckbox";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

type CustomerOption = StepOneData["customerType"][number];

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

const focusBySelector = (selector: string) => {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) {
    return;
  }

  target.focus({ preventScroll: true });
};

const customerOptions: Array<{
  value: CustomerOption;
  label: string;
  icon: string;
}> = [
  {
    value: "individuals",
    label: "أفراد وعائلات",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  },
  {
    value: "companies",
    label: "شركات ومؤسسات",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M4 20h16M6 20V8h12v12M9 8V5h6v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  },
  {
    value: "both",
    label: "الاتنين مع بعض",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M8.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM15.5 12a3 3 0 100-6 3 3 0 000 6zM3 20a5.5 5.5 0 0111 0M12 20a4.5 4.5 0 019 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  },
];

export const StepOne = () => {
  const stepData = useFormStore((state) => state.formData.stepOne);
  const navigationDirection = useFormStore(
    (state) => state.navigationDirection,
  );
  const updateStepData = useFormStore((state) => state.updateStepData);
  const nextStep = useFormStore((state) => state.nextStep);
  const formShakeControls = useAnimationControls();

  const defaultValues = useMemo<StepOneData>(
    () => ({
      name: stepData.name,
      businessName: stepData.businessName,
      businessDescription: stepData.businessDescription,
      customerType: stepData.customerType,
      uniqueValue: stepData.uniqueValue,
    }),
    [stepData],
  );

  const getValidationToastMessage = (value: StepOneData) => {
    if (value.name.trim().length < 2) {
      return "من فضلك اكتب اسمك";
    }
    if (value.businessName.trim().length === 0) {
      return "محتاجين اسم الشركة أو المشروع";
    }
    if (value.businessDescription.trim().length < 20) {
      return "من فضلك اكتب وصف أوضح (على الأقل 20 حرف)";
    }
    if (value.customerType.length === 0) {
      return "اختار نوع عملائك الأول";
    }
    if (value.uniqueValue.trim().length < 10) {
      return "من فضلك اكتب نقطة تميزك في 10 حروف على الأقل";
    }
    return "من فضلك راجع الحقول المطلوبة";
  };

  const focusFirstInvalidField = (value: StepOneData) => {
    if (value.name.trim().length < 2) {
      focusByName("name");
      return;
    }
    if (value.businessName.trim().length === 0) {
      focusByName("businessName");
      return;
    }
    if (value.businessDescription.trim().length < 20) {
      focusByName("businessDescription");
      return;
    }
    if (value.customerType.length === 0) {
      focusBySelector('[data-field="customerType"] button');
      return;
    }
    if (value.uniqueValue.trim().length < 10) {
      focusByName("uniqueValue");
    }
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      updateStepData("stepOne", value);
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
    updateStepData("stepOne", form.state.values);
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
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
          <span>خطوة أولى ممتازة — 4 أسئلة بس!</span>
        </div>
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
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
          </span>
          <h2 className="font-heading text-2xl font-bold text-textPrimary">
            خلينا نتعرف على شغلك الأول
          </h2>
        </div>
        <p className="font-body text-sm text-textSecondary sm:text-base">
          معلومات أساسية عن نشاطك التجاري
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
            name="name"
            validators={{
              onBlur: ({ value }) => {
                if (value.trim().length < 2) {
                  return "من فضلك اكتب اسمك";
                }
                return undefined;
              },
              onSubmit: ({ value }) => {
                if (value.trim().length < 2) {
                  return "من فضلك اكتب اسمك";
                }
                return undefined;
              },
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              return (
                <Input
                  label="اسمك إيه؟"
                  name={field.name}
                  placeholder="مثلاً: أحمد محمد"
                  type="text"
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
            name="businessName"
            validators={{
              onBlur: ({ value }) => {
                if (value.trim().length === 0) {
                  return "محتاجين اسم الشركة أو المشروع";
                }
                return undefined;
              },
              onSubmit: ({ value }) => {
                if (value.trim().length === 0) {
                  return "محتاجين اسم الشركة أو المشروع";
                }
                return undefined;
              },
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              return (
                <Input
                  label="اسم شركتك أو مشروعك"
                  name={field.name}
                  placeholder="مثلاً: شركة النجمة للتجارة"
                  type="text"
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
          transition={{ duration: 0.28, delay: 0.24 }}
        >
          <form.Field
            name="businessDescription"
            validators={{
              onBlur: ({ value }) => {
                if (value.trim().length < 20) {
                  return "من فضلك اكتب وصف أوضح (على الأقل 20 حرف)";
                }
                return undefined;
              },
              onSubmit: ({ value }) => {
                if (value.trim().length < 20) {
                  return "من فضلك اكتب وصف أوضح (على الأقل 20 حرف)";
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
                  label="شغلك في إيه بالظبط؟"
                  name={field.name}
                  placeholder="مثلاً: بيع ملابس أونلاين، عيادة أسنان، شركة محاسبة..."
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={() => field.handleBlur()}
                  tooltip="دي بتساعدنا نفهم طبيعة شغلك عشان نعمل الموقع المناسب ليك"
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
          transition={{ duration: 0.28, delay: 0.32 }}
          className="space-y-3"
        >
          <p className="text-sm font-semibold text-textPrimary">
            مين زبائنك الأساسيين؟
          </p>
          <form.Field
            name="customerType"
            validators={{
              onSubmit: ({ value }) => {
                if (value.length === 0) {
                  return "اختار نوع عملائك الأول";
                }
                return undefined;
              },
            }}
          >
            {(field) => {
              const showError =
                field.state.meta.isTouched || submissionAttempts > 0;
              const errorText = showError
                ? getFirstError(field.state.meta.errors)
                : undefined;

              const toggleOption = (option: CustomerOption) => {
                const exists = field.state.value.includes(option);
                const nextValue = exists
                  ? field.state.value.filter((item) => item !== option)
                  : [...field.state.value, option];

                field.handleChange(nextValue);
              };

              return (
                <>
                  <div
                    className="grid grid-cols-1 gap-2 xs:grid-cols-3 sm:gap-3"
                    data-field="customerType"
                  >
                    {customerOptions.map((option) => (
                      <CardCheckbox
                        key={option.value}
                        icon={option.icon}
                        label={option.label}
                        selected={field.state.value.includes(option.value)}
                        onClick={() => toggleOption(option.value)}
                        multiSelect
                      />
                    ))}
                  </div>

                  <AnimatePresence>
                    {errorText ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-2 text-sm text-error" role="alert">
                          {errorText}
                        </p>
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
          transition={{ duration: 0.28, delay: 0.4 }}
        >
          <form.Field
            name="uniqueValue"
            validators={{
              onBlur: ({ value }) => {
                if (value.trim().length < 10) {
                  return "من فضلك اكتب نقطة تميزك في 10 حروف على الأقل";
                }
                return undefined;
              },
              onSubmit: ({ value }) => {
                if (value.trim().length < 10) {
                  return "من فضلك اكتب نقطة تميزك في 10 حروف على الأقل";
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
                  label="إيه اللي بيميزك عن منافسيك؟"
                  name={field.name}
                  placeholder="مثلاً: أسعار أحسن، خدمة أسرع، جودة أعلى..."
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

        <div className="mt-6 flex items-center gap-3 pt-2">
          <div className="flex-1">
            <Button
              label="التالي ←"
              variant="primary"
              size="md"
              type="submit"
              className="h-11 w-full sm:h-10 sm:w-auto"
            />
          </div>
          <p className="text-center text-sm text-textSecondary">
            الخطوة 1 من 4
          </p>
        </div>
      </motion.form>
    </motion.section>
  );
};
