import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, JSX } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useDarkMode } from "../../hooks/useDarkMode";
import { storageService } from "../../lib/storageService";
import { syncService } from "../../lib/syncService";
import { useAuthStore } from "../../store/authStore";
import { type ProfileData } from "../../types/profile.types";

type TabKey = "profile" | "security" | "contact" | "preferences";
type TabErrors = Partial<Record<TabKey, boolean>>;
type TabDirty = Partial<Record<TabKey, boolean>>;

type EditProfileModalProps = {
  isOpen: boolean;
  identifier: string;
  initialProfile: ProfileData;
  initialTab?: TabKey;
  onClose: () => void;
  onSaved?: (profile: ProfileData) => void;
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const phoneRegex = /^01[0125]\d{8}$/;
const usernameRegex = /^[A-Za-z0-9_]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CITIES = [
  "القاهرة",
  "الإسكندرية",
  "الجيزة",
  "الشرقية",
  "الدقهلية",
  "البحيرة",
  "المنوفية",
  "الغربية",
  "كفر الشيخ",
  "دمياط",
  "بورسعيد",
  "الإسماعيلية",
  "السويس",
  "شمال سيناء",
  "جنوب سيناء",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "الوادي الجديد",
  "مطروح",
  "أخرى",
];

const BUSINESS_TYPES = [
  "تجارة",
  "مطاعم وكافيهات",
  "خدمات",
  "تعليم",
  "طب",
  "عقارات",
  "تقنية",
  "محتوى رقمي",
  "أخرى",
];

const tabTitle: Record<TabKey, string> = {
  profile: "الملف الشخصي",
  security: "الأمان",
  contact: "التواصل",
  preferences: "التفضيلات",
};

const tabOrder: TabKey[] = ["profile", "security", "contact", "preferences"];

const tabIcons: Record<TabKey, JSX.Element> = {
  profile: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 20a7 7 0 0114 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect
        x="5"
        y="11"
        width="14"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 11V8a3.5 3.5 0 117 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  ),
  contact: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M6 4h12v16H6z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  ),
  preferences: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 7h10M18 7h2M4 17h4M12 17h8M14 7a2 2 0 110 4 2 2 0 010-4zM8 15a2 2 0 110 4 2 2 0 010-4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const toDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("file-read-error"));
    reader.readAsDataURL(file);
  });
};

const normalizePhoneInput = (value: string) =>
  value.replace(/\D/g, "").slice(0, 11);

const getDirtyMap = (base: ProfileData, draft: ProfileData): TabDirty => {
  return {
    profile:
      base.fullName !== draft.fullName ||
      base.username !== draft.username ||
      base.businessName !== draft.businessName ||
      base.businessType !== draft.businessType ||
      base.bio !== draft.bio ||
      base.location !== draft.location ||
      base.avatar !== draft.avatar,
    security: false,
    contact:
      base.contact.phone !== draft.contact.phone ||
      base.contact.whatsapp !== draft.contact.whatsapp ||
      base.contact.email !== draft.contact.email ||
      base.contact.city !== draft.contact.city,
    preferences:
      base.darkMode !== draft.darkMode ||
      base.fontScale !== draft.fontScale ||
      base.notifications.projectUpdates !==
        draft.notifications.projectUpdates ||
      base.notifications.whatsappReminders !==
        draft.notifications.whatsappReminders ||
      base.notifications.emailReports !== draft.notifications.emailReports ||
      base.privacy.showEmailOnProfile !== draft.privacy.showEmailOnProfile ||
      base.privacy.allowProjectShowcase !== draft.privacy.allowProjectShowcase,
  };
};

const rowToggle = (
  label: string,
  description: string,
  value: boolean,
  onChange: (next: boolean) => void,
  savedFlag?: boolean,
) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-start"
      dir="rtl"
    >
      <div>
        <p className="text-sm font-semibold text-textPrimary">{label}</p>
        <p className="mt-0.5 text-xs text-textSecondary">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {savedFlag ? (
          <span className="text-xs text-success">✓ اتحفظ</span>
        ) : null}
        <span
          className={[
            "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors",
            value
              ? "border-primary bg-primary/75"
              : "border-border bg-textSecondary/30",
          ].join(" ")}
          aria-hidden="true"
        >
          <span
            className={[
              "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
              value ? "left-[22px]" : "left-0.5",
            ].join(" ")}
          />
        </span>
      </div>
    </button>
  );
};

export const EditProfileModal = ({
  isOpen,
  identifier,
  initialProfile,
  initialTab = "profile",
  onClose,
  onSaved,
}: EditProfileModalProps) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<ProfileData>(initialProfile);
  const [baseProfile, setBaseProfile] = useState<ProfileData>(initialProfile);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tabErrors, setTabErrors] = useState<TabErrors>({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savePulse, setSavePulse] = useState(false);
  const [disabledShake, setDisabledShake] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [pendingAvatarData, setPendingAvatarData] = useState("");
  const [securityValues, setSecurityValues] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });
  const [securityErrors, setSecurityErrors] = useState<Record<string, string>>(
    {},
  );
  const [logoutAllPassword, setLogoutAllPassword] = useState("");
  const [logoutAllError, setLogoutAllError] = useState("");
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savedIndicatorKey, setSavedIndicatorKey] = useState("");

  const authToken = useAuthStore((state) => state.authToken);
  const changePassword = useAuthStore((state) => state.changePassword);
  const verifyPassword = useAuthStore((state) => state.verifyPassword);
  const signOut = useAuthStore((state) => state.signOut);
  const patchUserView = useAuthStore((state) => state.patchUserView);
  const refreshUserView = useAuthStore((state) => state.refreshUserView);
  const { setDarkMode } = useDarkMode();

  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 768 : false;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab(initialTab);
    setDirection(1);
    setDraft(initialProfile);
    setBaseProfile(initialProfile);
    setFieldErrors({});
    setTabErrors({});
    setShowUnsavedWarning(false);
  }, [initialProfile, initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      if (isDirty) {
        setShowUnsavedWarning(true);
        return;
      }
      onClose();
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  });

  useEffect(() => {
    if (!savedIndicatorKey) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSavedIndicatorKey("");
    }, 1100);

    return () => window.clearTimeout(timeout);
  }, [savedIndicatorKey]);

  const dirtyByTab = useMemo(
    () => getDirtyMap(baseProfile, draft),
    [baseProfile, draft],
  );

  const isDirty = useMemo(
    () => Object.values(dirtyByTab).some(Boolean),
    [dirtyByTab],
  );

  const isGoogleUser = draft.authProvider === "google";

  const switchTab = (tab: TabKey) => {
    const nextIndex = tabOrder.indexOf(tab);
    const currentIndex = tabOrder.indexOf(activeTab);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(tab);
  };

  const closeAttempt = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
      return;
    }
    onClose();
  };

  const updateDraft = (next: Partial<ProfileData>) => {
    setDraft((prev) => ({ ...prev, ...next }));
  };

  const updateContact = (next: Partial<ProfileData["contact"]>) => {
    setDraft((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        ...next,
      },
    }));
  };

  const updateNotifications = (next: Partial<ProfileData["notifications"]>) => {
    setDraft((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        ...next,
      },
    }));
  };

  const updatePrivacy = (next: Partial<ProfileData["privacy"]>) => {
    setDraft((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        ...next,
      },
    }));
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("الصورة أكبر من اللازم — اختار صورة أصغر من 2MB");
      event.target.value = "";
      return;
    }

    try {
      const base64 = await toDataUrl(file);
      setPendingAvatarData(base64);
      setAvatarPreview(base64);
    } catch {
      toast.error("حصلت مشكلة أثناء قراءة الصورة");
    } finally {
      event.target.value = "";
    }
  };

  const validateAll = () => {
    const errors: Record<string, string> = {};
    const perTab: TabErrors = {};

    if (!draft.fullName.trim()) {
      errors.fullName = "من فضلك ادخل اسمك";
      perTab.profile = true;
    } else if (draft.fullName.trim().length < 3) {
      errors.fullName = "الاسم لازم يكون 3 أحرف على الأقل";
      perTab.profile = true;
    } else if (/\d/.test(draft.fullName)) {
      errors.fullName = "الاسم مش بيتضمن أرقام";
      perTab.profile = true;
    }

    if (draft.username.trim()) {
      if (draft.username.trim().length < 3) {
        errors.username = "اسم المستخدم لازم يكون 3 أحرف على الأقل";
        perTab.profile = true;
      } else if (!usernameRegex.test(draft.username.trim())) {
        errors.username = "اسم المستخدم بيتضمن حروف وأرقام وunderscore بس";
        perTab.profile = true;
      }
    }

    if (draft.username.length > 30) {
      errors.username = "اسم المستخدم لازم يكون أقل من 30 حرف";
      perTab.profile = true;
    }

    if (draft.businessName.trim() && draft.businessName.trim().length < 2) {
      errors.businessName = "اسم الشركة لازم يكون حرفين على الأقل";
      perTab.profile = true;
    }

    if (
      draft.contact.phone.trim() &&
      !phoneRegex.test(draft.contact.phone.trim())
    ) {
      errors.phone = "اكتب رقم تليفون مصري صحيح";
      perTab.contact = true;
    }

    if (
      draft.contact.whatsapp.trim() &&
      !phoneRegex.test(draft.contact.whatsapp.trim())
    ) {
      errors.whatsapp = "اكتب رقم واتساب مصري صحيح";
      perTab.contact = true;
    }

    if (
      draft.contact.email.trim() &&
      !emailRegex.test(draft.contact.email.trim())
    ) {
      errors.email = "ادخل إيميل صحيح";
      perTab.contact = true;
    }

    if (!isGoogleUser && draft.contact.phone.trim()) {
      const linked = storageService.load<string>(
        draft.contact.phone,
        "identifier",
        "",
      );
      if (linked && linked !== identifier) {
        errors.phone = "الرقم ده مرتبط بحساب تاني";
        perTab.contact = true;
      }
    }

    setFieldErrors(errors);
    setTabErrors(perTab);
    return { errors, perTab };
  };

  const performSave = async () => {
    if (!isDirty) {
      setDisabledShake(true);
      window.setTimeout(() => setDisabledShake(false), 350);
      return;
    }

    const validated = validateAll();
    if (Object.keys(validated.errors).length > 0) {
      const firstTab = tabOrder.find((tab) => validated.perTab[tab]);
      if (firstTab) {
        switchTab(firstTab);
      }
      toast.error("في بيانات غلط — اتحقق من التابات الحمرا");
      return;
    }

    setSaveLoading(true);

    const nextProfile: ProfileData = {
      ...draft,
      fullName: draft.fullName.trim(),
      username: draft.username.trim(),
      businessName: draft.businessName.trim(),
      businessType: draft.businessType.trim(),
      bio: draft.bio.trim(),
      location: draft.location.trim(),
      contact: {
        phone: draft.contact.phone.trim(),
        whatsapp: draft.contact.whatsapp.trim(),
        email: draft.contact.email.trim(),
        city: draft.contact.city.trim(),
      },
    };

    await syncService.saveUser(identifier, nextProfile);

    if (nextProfile.contact.phone) {
      storageService.save(nextProfile.contact.phone, "identifier", identifier);
    }

    setDarkMode(nextProfile.darkMode);
    storageService.applyFontScale(nextProfile.fontScale);

    patchUserView({
      displayName: nextProfile.username || nextProfile.fullName || "مستخدم",
      fullName: nextProfile.fullName,
      avatar: nextProfile.avatar,
      businessName: nextProfile.businessName,
      authProvider: nextProfile.authProvider,
    });
    refreshUserView();

    setSavePulse(true);
    window.setTimeout(() => setSavePulse(false), 250);

    setBaseProfile(nextProfile);
    setSaveLoading(false);
    onSaved?.(nextProfile);

    toast.success("اتحفظت التغييرات بنجاح");
    onClose();
  };

  const currentPassFilled = securityValues.currentPassword.trim().length > 0;
  const newPassFilled = securityValues.nextPassword.trim().length >= 6;
  const passDifferent =
    securityValues.nextPassword !== securityValues.currentPassword;
  const passMatch =
    securityValues.confirmPassword === securityValues.nextPassword;
  const canChangePassword =
    currentPassFilled && newPassFilled && passDifferent && passMatch;

  const onChangePassword = async () => {
    const nextErrors: Record<string, string> = {};

    if (!securityValues.currentPassword.trim()) {
      nextErrors.currentPassword = "من فضلك ادخل كلمة السر الحالية";
    }
    if (securityValues.nextPassword.trim().length < 6) {
      nextErrors.nextPassword = "كلمة السر لازم تكون 6 أحرف على الأقل";
    }
    if (
      securityValues.currentPassword.trim() &&
      securityValues.currentPassword === securityValues.nextPassword
    ) {
      nextErrors.nextPassword = "كلمة السر الجديدة لازم تختلف عن الحالية";
    }
    if (securityValues.confirmPassword !== securityValues.nextPassword) {
      nextErrors.confirmPassword = "كلمتي السر مش متطابقتين";
    }

    setSecurityErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setChangingPassword(true);
    const changed = await changePassword(
      securityValues.currentPassword,
      securityValues.nextPassword,
    );
    setChangingPassword(false);

    if (!changed.ok) {
      setSecurityErrors({
        currentPassword: changed.message || "كلمة السر الحالية غلط",
      });
      return;
    }

    setSecurityValues({
      currentPassword: "",
      nextPassword: "",
      confirmPassword: "",
    });
    setSecurityErrors({});
    toast.success("اتغيرت كلمة السر بنجاح");
  };

  const activeSessions = storageService.getSessions(identifier);

  const confirmLogoutAllSessions = async () => {
    if (!logoutAllPassword.trim()) {
      setLogoutAllError("اكتب كلمة المرور الأول");
      return;
    }

    const isValidPassword = await verifyPassword(logoutAllPassword);
    if (!isValidPassword) {
      setLogoutAllError("كلمة المرور غير صحيحة");
      return;
    }

    storageService.clearAllSessions(identifier);
    signOut();
    navigate("/signin", { replace: true });
  };

  const modalBody = (
    <motion.div
      dir="rtl"
      initial={
        isMobile ? { y: "100%", opacity: 0.4 } : { scale: 0.95, opacity: 0 }
      }
      animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
      exit={isMobile ? { y: "100%", opacity: 0 } : { scale: 0.95, opacity: 0 }}
      transition={
        isMobile
          ? { type: "spring", stiffness: 280, damping: 28 }
          : { duration: 0.25, ease: "easeOut" }
      }
      className={[
        "relative z-50 flex max-h-[96vh] w-full flex-col overflow-hidden border border-border",
        "bg-card shadow-2xl",
        isMobile
          ? "h-[100vh] rounded-t-2xl border-x-0 border-b-0"
          : "max-w-[560px] rounded-3xl",
      ].join(" ")}
    >
      <header className="sticky top-0 z-20 h-[52px] border-b border-border bg-card/95 px-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={closeAttempt}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-textSecondary hover:bg-background"
            aria-label="إغلاق"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <p className="font-heading text-base font-bold text-textPrimary">
            {tabTitle[activeTab]}
          </p>
          <motion.button
            type="button"
            onClick={performSave}
            animate={disabledShake ? { x: [0, -4, 4, -2, 2, 0] } : { x: 0 }}
            className={[
              "relative rounded-lg px-3 py-1.5 text-sm font-bold",
              isDirty
                ? "bg-primary text-white"
                : "cursor-not-allowed bg-border text-textSecondary",
              savePulse ? "ring-2 ring-success/50" : "",
            ].join(" ")}
            disabled={!isDirty || saveLoading}
          >
            {saveLoading ? "جاري الحفظ..." : "حفظ"}
          </motion.button>
        </div>
      </header>

      <nav
        className="grid grid-cols-4 border-b border-border bg-card"
        role="tablist"
        aria-label="Tabs"
      >
        {tabOrder.map((tab) => {
          const isActive = activeTab === tab;
          const hasDirty = Boolean(dirtyByTab[tab]);
          const hasError = Boolean(tabErrors[tab]);

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => switchTab(tab)}
              className={[
                "relative flex flex-col items-center justify-center gap-1 border-b-2 px-1 py-2 text-xs",
                isActive
                  ? "border-primary bg-[#F0F4FF] text-primary dark:bg-[#2D2D3D]"
                  : "border-transparent text-textSecondary",
              ].join(" ")}
            >
              {tabIcons[tab]}
              <span className="hidden sm:block">{tabTitle[tab]}</span>
              {hasDirty ? (
                <span className="absolute end-3 top-2 h-2 w-2 rounded-full bg-primary" />
              ) : null}
              {hasError ? (
                <span className="absolute end-1 top-2 h-2 w-2 rounded-full bg-error" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto px-0 py-4 sm:px-4 sm:py-5">
        <div className="px-4 sm:px-0">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? -22 : 22 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? 22 : -22 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-5"
            >
              {activeTab === "profile" ? (
                <section className="space-y-5">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-textSecondary">
                      Profile Photo
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl border border-primary px-3 py-2 text-sm font-semibold text-primary"
                        >
                          تغيير الصورة
                        </button>
                        {draft.avatar ? (
                          <button
                            type="button"
                            onClick={() => updateDraft({ avatar: "" })}
                            className="rounded-xl px-3 py-2 text-sm font-semibold text-error"
                          >
                            حذف الصورة
                          </button>
                        ) : null}
                      </div>
                      <img
                        src={
                          draft.avatar ||
                          draft.googlePhotoUrl ||
                          "https://dummyimage.com/80x80/cccccc/ffffff&text=+"
                        }
                        alt="preview"
                        className="h-20 w-20 rounded-full border-2 border-white object-cover shadow-md dark:border-[#2D2D3D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold">
                      الاسم الكامل
                    </label>
                    <input
                      value={draft.fullName}
                      onChange={(event) =>
                        updateDraft({
                          fullName: event.target.value.slice(0, 50),
                        })
                      }
                      className="h-12 w-full rounded-xl border border-border bg-background px-3"
                      placeholder="Ahmed Mohamed"
                    />
                    <p className="text-xs text-textSecondary">
                      هيبان كده: {draft.fullName || "Ahmed Mohamed"}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-error">
                        {fieldErrors.fullName || ""}
                      </p>
                      <p className="text-xs text-textSecondary">
                        {draft.fullName.length}/50
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold">
                      اسم المستخدم (اختياري)
                    </label>
                    <p className="text-xs text-textSecondary">
                      ده اللي هيبان للناس بدل اسمك الكامل
                    </p>
                    <input
                      value={draft.username}
                      onChange={(event) =>
                        updateDraft({
                          username: event.target.value.slice(0, 30),
                        })
                      }
                      className="h-12 w-full rounded-xl border border-border bg-background px-3"
                      placeholder="مثلاً: ahmed_dev"
                    />
                    <p className="text-xs text-error">
                      {fieldErrors.username || ""}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold">
                      اسم الشركة / المشروع
                    </label>
                    <input
                      value={draft.businessName}
                      onChange={(event) =>
                        updateDraft({
                          businessName: event.target.value.slice(0, 80),
                        })
                      }
                      className="h-12 w-full rounded-xl border border-border bg-background px-3"
                      placeholder="مثلاً: شركة النجمة"
                    />
                    <p className="text-xs text-error">
                      {fieldErrors.businessName || ""}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold">
                      نوع النشاط
                    </label>
                    <select
                      value={draft.businessType}
                      onChange={(event) =>
                        updateDraft({ businessType: event.target.value })
                      }
                      className="h-12 w-full rounded-xl border border-border bg-background px-3"
                    >
                      <option value="">اختر نوع النشاط</option>
                      {BUSINESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold">
                      نبذة مختصرة (اختياري)
                    </label>
                    <textarea
                      value={draft.bio}
                      onChange={(event) =>
                        updateDraft({ bio: event.target.value.slice(0, 150) })
                      }
                      className="min-h-[110px] w-full rounded-xl border border-border bg-background px-3 py-2"
                      placeholder="اكتب جملة أو اتنين عن شغلك..."
                    />
                    <div className="flex items-center justify-end">
                      <p className="text-xs text-textSecondary">
                        {draft.bio.length}/150
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold">
                      موقعك (اختياري)
                    </label>
                    <input
                      value={draft.location}
                      onChange={(event) =>
                        updateDraft({
                          location: event.target.value.slice(0, 80),
                        })
                      }
                      className="h-12 w-full rounded-xl border border-border bg-background px-3"
                      placeholder="مثلاً: القاهرة، مصر"
                    />
                  </div>
                </section>
              ) : null}

              {activeTab === "security" ? (
                <section className="space-y-5">
                  {isGoogleUser ? (
                    <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                      <p className="font-semibold text-primary">
                        حسابك متصل بجوجل
                      </p>
                      <p className="mt-1 text-sm text-textSecondary">
                        أمان حسابك بيتحكم فيه من إعدادات جوجل بتاعتك
                      </p>
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
                      >
                        إعدادات أمان جوجل
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-textSecondary">
                        تغيير كلمة السر
                      </p>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold">
                          كلمة السر الحالية
                        </label>
                        <input
                          type="password"
                          value={securityValues.currentPassword}
                          onChange={(event) =>
                            setSecurityValues((prev) => ({
                              ...prev,
                              currentPassword: event.target.value,
                            }))
                          }
                          className="h-12 w-full rounded-xl border border-border bg-card px-3"
                        />
                        <p className="text-xs text-error">
                          {securityErrors.currentPassword || ""}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold">
                          كلمة السر الجديدة
                        </label>
                        <input
                          type="password"
                          value={securityValues.nextPassword}
                          onChange={(event) =>
                            setSecurityValues((prev) => ({
                              ...prev,
                              nextPassword: event.target.value,
                            }))
                          }
                          className="h-12 w-full rounded-xl border border-border bg-card px-3"
                        />
                        <div className="h-2 overflow-hidden rounded-full bg-border">
                          <div
                            className={[
                              "h-full transition-all",
                              securityValues.nextPassword.length >= 10
                                ? "bg-success"
                                : securityValues.nextPassword.length >= 6
                                  ? "bg-accent"
                                  : "bg-error",
                            ].join(" ")}
                            style={{
                              width: `${Math.min(securityValues.nextPassword.length * 10, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-error">
                          {securityErrors.nextPassword || ""}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold">
                          تأكيد كلمة السر الجديدة
                        </label>
                        <input
                          type="password"
                          value={securityValues.confirmPassword}
                          onChange={(event) =>
                            setSecurityValues((prev) => ({
                              ...prev,
                              confirmPassword: event.target.value,
                            }))
                          }
                          className="h-12 w-full rounded-xl border border-border bg-card px-3"
                        />
                        <p className="text-xs text-textSecondary">
                          {passMatch && securityValues.confirmPassword
                            ? "متطابق"
                            : ""}
                        </p>
                        <p className="text-xs text-error">
                          {securityErrors.confirmPassword || ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onChangePassword}
                        disabled={!canChangePassword || changingPassword}
                        className={[
                          "h-11 rounded-xl px-4 text-sm font-bold",
                          canChangePassword
                            ? "bg-primary text-white"
                            : "cursor-not-allowed bg-border text-textSecondary",
                        ].join(" ")}
                      >
                        {changingPassword
                          ? "جاري التغيير..."
                          : "تغيير كلمة السر"}
                      </button>
                    </div>
                  )}

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">التحقق بخطوتين</p>
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                        قريباً
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-textSecondary">
                      هنضيف التحقق بخطوتين قريباً لحماية حسابك أكتر
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="font-semibold">الأجهزة المتصلة</p>
                    <div className="mt-3 space-y-2">
                      {activeSessions.length === 0 ? (
                        <p className="text-sm text-textSecondary">
                          لا يوجد جلسات محفوظة
                        </p>
                      ) : (
                        activeSessions.map((session) => (
                          <div
                            key={session.token}
                            className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
                          >
                            <p className="text-sm text-textPrimary">
                              {session.deviceLabel}
                            </p>
                            {session.token === authToken ? (
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                                هذا الجهاز
                              </span>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoutAllConfirm(true);
                        setLogoutAllPassword("");
                        setLogoutAllError("");
                      }}
                      className="mt-3 text-sm font-semibold text-error"
                    >
                      تسجيل الخروج من كل الأجهزة
                    </button>

                    {showLogoutAllConfirm ? (
                      <div className="mt-3 rounded-xl border border-border bg-card p-3">
                        <label className="block text-xs font-semibold text-textPrimary">
                          اكتب كلمة المرور للتأكيد
                        </label>
                        <input
                          type="password"
                          value={logoutAllPassword}
                          onChange={(event) => {
                            setLogoutAllPassword(event.target.value);
                            setLogoutAllError("");
                          }}
                          className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3"
                          autoComplete="current-password"
                        />
                        {logoutAllError ? (
                          <p className="mt-2 text-xs text-error">
                            {logoutAllError}
                          </p>
                        ) : null}
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={confirmLogoutAllSessions}
                            className="flex-1 rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            تأكيد الخروج
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowLogoutAllConfirm(false)}
                            className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {activeTab === "contact" ? (
                <section className="space-y-5">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold">
                      رقم التليفون
                    </label>
                    <input
                      value={draft.contact.phone}
                      onChange={(event) =>
                        updateContact({
                          phone: normalizePhoneInput(event.target.value),
                        })
                      }
                      className="h-12 w-full rounded-xl border border-border bg-background px-3"
                      placeholder="01xxxxxxxxx"
                    />
                    <p className="text-xs text-error">
                      {fieldErrors.phone || ""}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4 text-[#25D366]"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M20.52 3.48A11.82 11.82 0 0012.08 0C5.5 0 .17 5.33.17 11.91c0 2.1.55 4.16 1.6 5.97L0 24l6.28-1.64a11.86 11.86 0 005.8 1.48h.01c6.58 0 11.91-5.33 11.91-11.91a11.8 11.8 0 00-3.48-8.45z" />
                      </svg>
                      رقم الواتساب
                    </label>
                    <p className="text-xs text-textSecondary">
                      لو مختلف عن رقم التليفون
                    </p>
                    <input
                      value={draft.contact.whatsapp}
                      onChange={(event) =>
                        updateContact({
                          whatsapp: normalizePhoneInput(event.target.value),
                        })
                      }
                      className="h-12 w-full rounded-xl border border-border bg-background px-3"
                      placeholder="01xxxxxxxxx"
                    />
                    <p className="text-xs text-error">
                      {fieldErrors.whatsapp || ""}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold">
                      البريد الإلكتروني
                    </label>
                    {isGoogleUser ? (
                      <>
                        <input
                          value={draft.contact.email}
                          readOnly
                          className="h-12 w-full rounded-xl border border-border bg-background/70 px-3 text-textSecondary"
                        />
                        <p className="text-xs text-primary">
                          الإيميل ده من حساب جوجل بتاعتك
                        </p>
                      </>
                    ) : (
                      <>
                        <input
                          value={draft.contact.email}
                          onChange={(event) =>
                            updateContact({ email: event.target.value })
                          }
                          className="h-12 w-full rounded-xl border border-border bg-background px-3"
                          placeholder="example@email.com"
                        />
                        <p className="text-xs text-error">
                          {fieldErrors.email || ""}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold">
                      مدينتك
                    </label>
                    <select
                      value={draft.contact.city}
                      onChange={(event) =>
                        updateContact({ city: event.target.value })
                      }
                      className="h-12 w-full rounded-xl border border-border bg-background px-3"
                    >
                      <option value="">اختار المدينة</option>
                      {CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
              ) : null}

              {activeTab === "preferences" ? (
                <section className="space-y-5">
                  <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-textSecondary">
                      Appearance
                    </p>
                    {rowToggle(
                      "الوضع الداكن",
                      "غير مظهر التطبيق للوضع الداكن",
                      draft.darkMode,
                      (next) => {
                        updateDraft({ darkMode: next });
                        setDarkMode(next);
                      },
                    )}

                    <div className="rounded-xl border border-border bg-card px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-textPrimary">
                            اللغة
                          </p>
                          <p className="text-xs text-textSecondary">
                            دعم اللغة الإنجليزية قريباً
                          </p>
                        </div>
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                          قريباً
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-textSecondary">
                      Notifications
                    </p>
                    {rowToggle(
                      "تحديثات المشروع",
                      "إشعارات عند تقدم حالة المشروع",
                      draft.notifications.projectUpdates,
                      (next) => {
                        updateNotifications({ projectUpdates: next });
                        void syncService.saveUser(identifier, {
                          notifications: {
                            ...draft.notifications,
                            projectUpdates: next,
                          },
                        });
                        setSavedIndicatorKey("projectUpdates");
                      },
                      savedIndicatorKey === "projectUpdates",
                    )}

                    {rowToggle(
                      "تذكيرات واتساب",
                      "رسائل تذكير بالمواعيد",
                      draft.notifications.whatsappReminders,
                      (next) => {
                        updateNotifications({ whatsappReminders: next });
                        void syncService.saveUser(identifier, {
                          notifications: {
                            ...draft.notifications,
                            whatsappReminders: next,
                          },
                        });
                        setSavedIndicatorKey("whatsappReminders");
                      },
                      savedIndicatorKey === "whatsappReminders",
                    )}

                    {rowToggle(
                      "إيميلات التقرير",
                      "تقارير أسبوعية على الإيميل",
                      draft.notifications.emailReports,
                      (next) => {
                        updateNotifications({ emailReports: next });
                        void syncService.saveUser(identifier, {
                          notifications: {
                            ...draft.notifications,
                            emailReports: next,
                          },
                        });
                        setSavedIndicatorKey("emailReports");
                      },
                      savedIndicatorKey === "emailReports",
                    )}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-textSecondary">
                      Privacy
                    </p>
                    {rowToggle(
                      "إظهار إيميلك على الملف الشخصي",
                      "مخصص لميزات اجتماعية مستقبلية",
                      draft.privacy.showEmailOnProfile,
                      (next) => {
                        updatePrivacy({ showEmailOnProfile: next });
                      },
                    )}

                    {rowToggle(
                      "السماح بعرض مشروعك كنموذج عمل",
                      "ممكن نستخدم موقعك كمثال لعملاء تانيين (بإذنك)",
                      draft.privacy.allowProjectShowcase,
                      (next) => {
                        updatePrivacy({ allowProjectShowcase: next });
                      },
                    )}
                  </div>
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-card p-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:hidden">
        <button
          type="button"
          onClick={closeAttempt}
          className="h-[52px] flex-1 rounded-xl border border-border px-4 text-sm font-semibold"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={performSave}
          disabled={!isDirty || saveLoading}
          className={[
            "h-[52px] flex-1 rounded-xl px-4 text-sm font-bold",
            isDirty ? "bg-primary text-white" : "bg-border text-textSecondary",
          ].join(" ")}
        >
          حفظ التغييرات
        </button>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelection}
      />

      <AnimatePresence>
        {showUnsavedWarning ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 z-[60] rounded-2xl border border-border bg-card p-4 shadow-xl"
          >
            <p className="font-semibold text-textPrimary">
              عندك تغييرات لم تتحفظ
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarning(false);
                  void performSave();
                }}
                className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white"
              >
                احتفظ بالتغييرات
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarning(false);
                  onClose();
                }}
                className="flex-1 rounded-xl bg-error px-3 py-2 text-sm font-bold text-white"
              >
                اغلق بدون حفظ
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {avatarPreview ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/70"
              onClick={() => {
                setAvatarPreview("");
                setPendingAvatarData("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[80] m-auto h-fit w-[92vw] max-w-sm rounded-2xl border border-border bg-card p-4"
              dir="rtl"
            >
              <p className="font-semibold text-textPrimary">معاينة الصورة</p>
              <img
                src={avatarPreview}
                alt="avatar-preview"
                className="mt-3 h-56 w-full rounded-xl object-cover"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!pendingAvatarData) {
                      return;
                    }
                    updateDraft({ avatar: pendingAvatarData });
                    void syncService.saveUser(identifier, {
                      avatar: pendingAvatarData,
                    });
                    patchUserView({ avatar: pendingAvatarData });
                    toast.success("اتغيرت الصورة بنجاح");
                    setAvatarPreview("");
                    setPendingAvatarData("");
                  }}
                  className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white"
                >
                  تأكيد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPreview("");
                    setPendingAvatarData("");
                  }}
                  className="flex-1 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            type="button"
            onClick={() => {
              if (!isMobile) {
                closeAttempt();
              }
            }}
            className="fixed inset-0 z-40 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="close"
          />
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-4">
            {modalBody}
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
};
