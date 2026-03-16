import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { slideInLeft, slideInRight } from "../../lib/animations";
import { useFormStore } from "../../store/formStore";
import type { StepThreeData } from "../../types/form.types";
import { Button } from "../ui/Button";
import { CardCheckbox } from "../ui/CardCheckbox";
import { Toggle } from "../ui/Toggle";
import { Tooltip } from "../ui/Tooltip";

type FieldError = string | undefined;

const HOME_PAGE = "home";
const UNKNOWN_FEATURE = "unknown";

type PageCard = {
  value: string;
  label: string;
  description: string;
  icon: string;
  locked?: boolean;
};

const getFirstError = (errors: unknown[] | undefined): FieldError => {
  if (!errors || errors.length === 0) {
    return undefined;
  }

  const firstError = errors[0];
  return typeof firstError === "string" ? firstError : undefined;
};

const focusBySelector = (selector: string) => {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) {
    return;
  }

  target.focus({ preventScroll: true });
};

const pageCards: PageCard[] = [
  {
    value: HOME_PAGE,
    label: "الصفحة الرئيسية",
    description: "دي الصفحة الأساسية اللي الناس بتدخل عليها",
    locked: true,
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V20H4v-9.5z" stroke="currentColor" stroke-width="1.8"/><path d="M9 20v-5h6v5" stroke="currentColor" stroke-width="1.8"/></svg>',
  },
  {
    value: "about",
    label: "من نحن",
    description: "قصة شركتك وفريقك",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M5 20a7 7 0 0114 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  },
  {
    value: "contact",
    label: "تواصل معنا",
    description: "عنوانك وبياناتك",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M4 6h16v12H4z" stroke="currentColor" stroke-width="1.8"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="1.8"/></svg>',
  },
  {
    value: "portfolio",
    label: "معرض الأعمال",
    description: "اعرض شغلك السابق",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 14l2-2 2 2 3-3 3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  },
  {
    value: "store",
    label: "المتجر الإلكتروني",
    description: "بيع أونلاين",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M4 7h16l-1.5 10h-13L4 7z" stroke="currentColor" stroke-width="1.8"/><circle cx="10" cy="19" r="1.2" fill="currentColor"/><circle cx="16" cy="19" r="1.2" fill="currentColor"/></svg>',
  },
  {
    value: "blog",
    label: "المدونة",
    description: "مقالات ومحتوى",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  },
  {
    value: "services",
    label: "الخدمات",
    description: "اعرض خدماتك",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M12 3l3 6 6 .8-4.5 4.4 1 6.3L12 17l-5.5 3.5 1-6.3L3 9.8 9 9l3-6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  },
  {
    value: "booking",
    label: "حجز مواعيد",
    description: "عملاءك يحجزوا أونلاين",
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 3v5M16 3v5M4 11h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  },
];

const featureCards = [
  {
    value: "contact_form",
    label: "نموذج تواصل",
    description: "عشان الناس تبعتلك رسائل",
    tooltip: "يعني صفحة بسيطة يكتبوا فيها الاسم والرسالة وتوصلك مباشرة",
  },
  {
    value: "whatsapp_button",
    label: "زرار واتساب",
    description: "زرار واتساب طايف في الصفحة",
    tooltip: "بيكون ظاهر طول الوقت عشان العميل يكلمك بسرعة",
  },
  {
    value: "online_sale",
    label: "بيع أونلاين",
    description: "عربية تسوق ودفع إلكتروني",
    tooltip: "الناس تختار المنتج وتدفع من على الموقع",
  },
  {
    value: "appointments",
    label: "حجز مواعيد",
    description: "زي ما بتحجز دكتور أونلاين",
    tooltip: "العميل يختار اليوم والوقت المناسب ويحجز على طول",
  },
  {
    value: "accounts",
    label: "تسجيل دخول",
    description: "عملاءك يعملوا حساب خاص",
    tooltip: "كل عميل يبقى له صفحة خاصة ببياناته أو طلباته",
  },
  {
    value: "google_map",
    label: "خريطة جوجل",
    description: "عشان الناس تلاقي مكانك",
    tooltip: "الخريطة تظهر مكانك الحقيقي وتساعدهم يوصلوا بسهولة",
  },
  {
    value: "gallery",
    label: "ألبوم صور",
    description: "معرض صور احترافي",
    tooltip: "تنظيم صور شغلك بشكل مرتب وواضح",
  },
  {
    value: UNKNOWN_FEATURE,
    label: "مش عارف",
    description: "هنساعدك تختار",
    tooltip: "اختار دي لو لسه مش متأكد وإحنا نقترح عليك المناسب",
  },
] as const;

const contentCards = [
  {
    value: "self",
    label: "أنا هكتبه",
    description: "هتبعتلنا النصوص والصور",
  },
  {
    value: "help_me",
    label: "ساعدوني",
    description: "محتاج مساعدة في الكتابة",
  },
  {
    value: "not_sure",
    label: "مش عارف لسه",
    description: "هنتكلم في ده بعدين",
  },
] as const;

export const StepThree = () => {
  const stepData = useFormStore((state) => state.formData.stepThree);
  const updateStepData = useFormStore((state) => state.updateStepData);
  const nextStep = useFormStore((state) => state.nextStep);
  const prevStep = useFormStore((state) => state.prevStep);
  const navigationDirection = useFormStore(
    (state) => state.navigationDirection,
  );
  const formShakeControls = useAnimationControls();

  const defaultValues = useMemo<StepThreeData>(
    () => ({
      pages: stepData.pages.includes(HOME_PAGE)
        ? stepData.pages
        : [HOME_PAGE, ...stepData.pages],
      features: stepData.features,
      contentResponsibility: stepData.contentResponsibility,
      hasBrandAssets: stepData.hasBrandAssets,
      brandAssetNames: stepData.brandAssetNames,
    }),
    [stepData],
  );

  const getValidationToastMessage = (value: StepThreeData) => {
    if (value.pages.length === 0) {
      return "اختار الصفحات اللي محتاجها";
    }
    if (value.contentResponsibility.trim().length === 0) {
      return "اختار مين هيجهز المحتوى";
    }
    return "من فضلك راجع الحقول المطلوبة";
  };

  const focusFirstInvalidField = (value: StepThreeData) => {
    if (value.pages.length === 0) {
      focusBySelector('[data-field="pages"] button');
      return;
    }
    if (value.contentResponsibility.trim().length === 0) {
      focusBySelector('[data-field="contentResponsibility"] button');
    }
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const normalizedPages = value.pages.includes(HOME_PAGE)
        ? value.pages
        : [HOME_PAGE, ...value.pages];

      updateStepData("stepThree", {
        ...value,
        pages: normalizedPages,
      });
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
    updateStepData("stepThree", form.state.values);
  }, [form.state.values, updateStepData]);

  const dropzone = useDropzone({
    onDrop: (acceptedFiles) => {
      const fileNames = acceptedFiles.map((file) => file.name);
      const currentNames = form.getFieldValue("brandAssetNames");
      const nextNames = Array.from(new Set([...currentNames, ...fileNames]));
      form.setFieldValue("brandAssetNames", nextNames);
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
      "application/postscript": [".ai"],
    },
  });

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
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
          <span>نص الطريق خلص! كمّل كده</span>
        </div>
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
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
          </span>
          <h2 className="font-heading text-2xl font-bold text-textPrimary">
            الموقع هيبقى فيه إيه؟
          </h2>
        </div>
        <p className="font-body text-sm text-textSecondary sm:text-base">
          اختار من الكروت — مش محتاج تعرف حاجة تقنية
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08 }}
          className="space-y-3"
        >
          <p className="text-sm font-semibold text-textPrimary">
            الموقع هيبقى فيه أنهي صفحات؟
          </p>
          <form.Field
            name="pages"
            validators={{
              onSubmit: ({ value }) => {
                if (value.length === 0) {
                  return "اختار الصفحات اللي محتاجها";
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

              const togglePage = (
                value: string,
                locked: boolean | undefined,
              ) => {
                if (locked) {
                  return;
                }

                const exists = field.state.value.includes(value);
                const nextPages = exists
                  ? field.state.value.filter((item) => item !== value)
                  : [...field.state.value, value];

                if (!nextPages.includes(HOME_PAGE)) {
                  nextPages.push(HOME_PAGE);
                }

                field.handleChange(nextPages);
              };

              return (
                <>
                  <div
                    className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4"
                    data-field="pages"
                  >
                    {pageCards.map((card) => (
                      <CardCheckbox
                        key={card.value}
                        icon={card.icon}
                        label={card.label}
                        description={card.description}
                        selected={field.state.value.includes(card.value)}
                        onClick={() => togglePage(card.value, card.locked)}
                        multiSelect
                        disabled={card.locked}
                        locked={card.locked}
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
            محتاج حاجات خاصة في الموقع؟
          </p>
          <form.Field name="features">
            {(field) => {
              const toggleFeature = (value: string) => {
                if (value === UNKNOWN_FEATURE) {
                  const isUnknownSelected =
                    field.state.value.includes(UNKNOWN_FEATURE);
                  field.handleChange(
                    isUnknownSelected ? [] : [UNKNOWN_FEATURE],
                  );
                  return;
                }

                const withoutUnknown = field.state.value.filter(
                  (item) => item !== UNKNOWN_FEATURE,
                );
                const exists = withoutUnknown.includes(value);
                const nextValue = exists
                  ? withoutUnknown.filter((item) => item !== value)
                  : [...withoutUnknown, value];

                field.handleChange(nextValue);
              };

              return (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                  {featureCards.map((card) => (
                    <CardCheckbox
                      key={card.value}
                      icon="<svg viewBox='0 0 24 24' width='24' height='24' fill='none' aria-hidden='true'><rect x='4' y='4' width='16' height='16' rx='4' stroke='currentColor' stroke-width='1.8'/><path d='M8 12h8M12 8v8' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'/></svg>"
                      label={card.label}
                      description={card.description}
                      tooltip={card.tooltip}
                      selected={field.state.value.includes(card.value)}
                      onClick={() => toggleFeature(card.value)}
                      multiSelect
                    />
                  ))}
                </div>
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
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-textPrimary">
              مين هيكتب محتوى الموقع؟
            </p>
            <Tooltip content="المحتوى هو الكلام والصور اللي هتبقى على الموقع">
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
            name="contentResponsibility"
            validators={{
              onSubmit: ({ value }) => {
                if (value.trim().length === 0) {
                  return "اختار مين هيجهز المحتوى";
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

              return (
                <>
                  <div
                    className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                    data-field="contentResponsibility"
                  >
                    {contentCards.map((card) => (
                      <CardCheckbox
                        key={card.value}
                        icon="<svg viewBox='0 0 24 24' width='24' height='24' fill='none' aria-hidden='true'><path d='M5 4h14v16H5z' stroke='currentColor' stroke-width='1.8'/><path d='M8 9h8M8 13h8M8 17h5' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'/></svg>"
                        label={card.label}
                        description={card.description}
                        selected={field.state.value === card.value}
                        onClick={() => field.handleChange(card.value)}
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
          className="space-y-3"
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold text-textPrimary">
              عندك هوية بصرية؟
            </p>
            <div className="flex items-center gap-2 text-sm text-textSecondary">
              <span>يعني لوجو، ألوان محددة، أو خطوط</span>
              <Tooltip content="الهوية البصرية هي الشكل اللي بيميز شركتك — زي ليبل على منتجاتك">
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-accent transition-colors hover:bg-accent/10"
                  aria-label="معلومة إضافية"
                >
                  ?
                </button>
              </Tooltip>
            </div>
          </div>

          <form.Field name="hasBrandAssets">
            {(field) => (
              <Toggle
                labelOn="آه عندي"
                labelOff="لا معنديش"
                value={field.state.value}
                onChange={(nextValue) => {
                  field.handleChange(nextValue);
                  if (!nextValue) {
                    form.setFieldValue("brandAssetNames", []);
                  }
                }}
              />
            )}
          </form.Field>

          <form.Field name="hasBrandAssets">
            {(brandToggle) => (
              <AnimatePresence initial={false} mode="wait">
                {brandToggle.state.value ? (
                  <motion.div
                    key="upload-box"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div
                      {...dropzone.getRootProps()}
                      className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-card p-4 text-center transition-colors hover:border-primary/40 sm:p-6"
                    >
                      <input {...dropzone.getInputProps()} />
                      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M12 16V6M8 10l4-4 4 4"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M4 18h16"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-textPrimary">
                        اسحب الملفات هنا أو اضغط للاختيار
                      </p>
                      <p className="mt-1 text-xs text-textSecondary">
                        PNG, JPG, PDF, AI — حجم أقصى 10MB
                      </p>
                    </div>

                    <form.Field name="brandAssetNames">
                      {(field) =>
                        field.state.value.length > 0 ? (
                          <ul className="mt-3 space-y-2">
                            {field.state.value.map((fileName) => (
                              <li
                                key={fileName}
                                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-textSecondary"
                              >
                                <span className="truncate">{fileName}</span>
                                <button
                                  type="button"
                                  className="text-error"
                                  onClick={() =>
                                    field.handleChange(
                                      field.state.value.filter(
                                        (name) => name !== fileName,
                                      ),
                                    )
                                  }
                                >
                                  حذف
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null
                      }
                    </form.Field>
                  </motion.div>
                ) : (
                  <motion.div
                    key="brand-help-box"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-[#9a4c1d]">
                      مش مشكلة! ممكن نساعدك تعمل هوية بصرية كاملة قبل ما نبدأ
                      الموقع
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
            الخطوة 3 من 4
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
