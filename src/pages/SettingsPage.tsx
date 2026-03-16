import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { EditProfileModal } from "../components/profile/EditProfileModal";
import { buildInitialProfile } from "../components/profile/profileHelpers";
import { Header } from "../components/layout/Header";
import {
  getInitials,
  hashName,
  useClientProfile,
} from "../hooks/useClientProfile";
import { useDarkMode } from "../hooks/useDarkMode";
import { parseIdentifier } from "../lib/buildIdentifier";
import { storageService } from "../lib/storageService";
import { clearClientLocalData } from "../lib/submissionStorage";
import { getWhatsAppMeta } from "../lib/whatsapp";
import { useAuthStore } from "../store/authStore";

type ModalTab = "profile" | "security" | "contact" | "preferences";

const avatarPalette = [
  "#1B4FFF",
  "#FF6B35",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
];

const faqItems = [
  {
    q: "ازاي أقدر أبدأ مشروع جديد؟",
    a: "من صفحة البروفايل اضغط ابدأ مشروع جديد وهتلاقي الفورم خطوة بخطوة.",
  },
  {
    q: "فين أتابع حالة المشروع؟",
    a: "من زر تتبع المشروع تقدر تشوف المرحلة الحالية وتحديثاتها.",
  },
  {
    q: "هل التعديلات بتتحفظ تلقائي؟",
    a: "التبديلات في الإشعارات والمظهر تتحفظ فوراً، وباقي البيانات من زر الحفظ.",
  },
];

const SettingGroup = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section>
    <p className="mb-2 px-2 text-xs font-medium text-textSecondary">{title}</p>
    <div className="overflow-hidden rounded-none border border-border bg-card sm:rounded-xl">
      {children}
    </div>
  </section>
);

const rowClassName =
  "flex min-h-[52px] items-center justify-between border-b border-border/70 px-4 py-2 text-start last:border-b-0 hover:bg-background/60 active:scale-[0.99]";

const SettingsPage = () => {
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);
  const deleteCurrentAccount = useAuthStore(
    (state) => state.deleteCurrentAccount,
  );
  const verifyPassword = useAuthStore((state) => state.verifyPassword);
  const currentUserEmail =
    useAuthStore((state) => state.currentUserEmail) ?? "";
  const patchUserView = useAuthStore((state) => state.patchUserView);
  const authUser = useAuthStore((state) => state.user);
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  const { isDark, setDarkMode } = useDarkMode();

  const { identifier, profile, submission, saveProfile } = useClientProfile();

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

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("profile");
  const [showSessions, setShowSessions] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [confirmAction, setConfirmAction] = useState<
    "delete" | "logoutAll" | null
  >(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const initialProfile = useMemo(
    () => buildInitialProfile(profile, currentUserEmail),
    [currentUserEmail, profile],
  );

  const avatarLabel =
    profile.username || profile.fullName || currentUserEmail || "مستخدم";
  const avatarColor =
    avatarPalette[hashName(avatarLabel) % avatarPalette.length];
  const avatarSrc = profile.avatar || profile.googlePhotoUrl || "";

  const sessions = storageService.getSessions(identifier || currentUserEmail);
  const { hasValidWaNumber, waHref } = getWhatsAppMeta();

  const openModal = (tab: ModalTab) => {
    setModalTab(tab);
    setModalOpen(true);
  };

  const onNotificationToggle = (
    key: "projectUpdates" | "whatsappReminders" | "emailReports",
    value: boolean,
  ) => {
    saveProfile({
      notifications: {
        ...profile.notifications,
        [key]: value,
      },
    });
    toast.success("✓ اتحفظ");
  };

  const onPrivacyToggle = (
    key: "showEmailOnProfile" | "allowProjectShowcase",
    value: boolean,
  ) => {
    saveProfile({
      privacy: {
        ...profile.privacy,
        [key]: value,
      },
    });
    toast.success("✓ اتحفظ");
  };

  const linkGoogle = () => {
    window.open("https://accounts.google.com", "_blank", "noopener,noreferrer");
    saveProfile({
      authProvider: "google",
      googleId: String(Date.now()),
      googlePhotoUrl: profile.googlePhotoUrl,
    });
    patchUserView({ authProvider: "google" });
    toast.success("اتربط حساب جوجل بنجاح");
  };

  const onDangerDelete = () => {
    if (submission?.phone) {
      clearClientLocalData(submission.phone);
    }

    const deleted = deleteCurrentAccount();
    if (!deleted.ok) {
      toast.error(deleted.message || "ماقدرناش نحذف الحساب");
      return;
    }

    toast.success("تم حذف بيانات الحساب من الجهاز");
    navigate("/signin", { replace: true });
  };

  const askForPassword = (action: "delete" | "logoutAll") => {
    setConfirmAction(action);
    setConfirmPassword("");
    setConfirmError("");
  };

  const runConfirmedAction = async () => {
    if (!confirmPassword.trim()) {
      setConfirmError("اكتب كلمة المرور الأول");
      return;
    }

    const isValidPassword = await verifyPassword(confirmPassword);
    if (!isValidPassword) {
      setConfirmError("كلمة المرور غير صحيحة");
      return;
    }

    if (confirmAction === "logoutAll") {
      storageService.clearAllSessions(identifier || currentUserEmail);
      signOut();
      navigate("/signin", { replace: true });
      return;
    }

    if (confirmAction === "delete") {
      onDangerDelete();
    }
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary" dir="rtl">
      <Header />

      <main className="mx-auto w-full max-w-4xl px-4 pb-14 pt-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-background"
            aria-label="رجوع"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 12h12M8 12l4-4M8 12l4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h1 className="font-heading text-lg font-bold">الإعدادات</h1>
          <div className="h-10 w-10" />
        </div>

        <div className="space-y-5">
          <SettingGroup title="الحساب">
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              className={rowClassName}
              onClick={() => openModal("profile")}
            >
              <div className="flex items-center gap-3">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getInitials(avatarLabel)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">الملف الشخصي</p>
                  <p className="text-xs text-textSecondary">
                    {profile.username || profile.fullName || "مستخدم"}
                  </p>
                </div>
              </div>
              <span className="text-textSecondary">‹</span>
            </motion.button>

            {profile.authProvider !== "google" ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                className={rowClassName}
                onClick={() => openModal("security")}
              >
                <div className="flex items-center gap-3">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-textSecondary"
                    fill="none"
                    aria-hidden="true"
                  >
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
                  <p className="text-sm font-semibold">تغيير كلمة السر</p>
                </div>
                <span className="text-textSecondary">‹</span>
              </motion.button>
            ) : null}

            {profile.authProvider !== "google" ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                className={rowClassName}
                onClick={linkGoogle}
              >
                <div>
                  <p className="text-sm font-semibold">ربط حساب جوجل</p>
                  <p className="text-xs text-textSecondary">
                    اربط حساب جوجل بتاعك
                  </p>
                </div>
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5a9.5 9.5 0 100 19c5.5 0 9.2-3.8 9.2-9.2 0-.6-.1-1.1-.2-1.6H12z"
                    fill="#4285F4"
                  />
                </svg>
              </motion.button>
            ) : null}

            {sessions.length > 1 ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                className={rowClassName}
                onClick={() => setShowSessions((prev) => !prev)}
              >
                <div className="flex items-center gap-3">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-textSecondary"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle
                      cx="16"
                      cy="9"
                      r="2.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M3 19a5 5 0 0110 0M12 19a4 4 0 018 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="text-sm font-semibold">حسابات محفوظة</p>
                </div>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                  {sessions.length}
                </span>
              </motion.button>
            ) : null}
          </SettingGroup>

          <SettingGroup title="الإشعارات">
            {[
              [
                "تحديثات المشروع",
                profile.notifications.projectUpdates,
                "projectUpdates",
              ],
              [
                "تذكيرات واتساب",
                profile.notifications.whatsappReminders,
                "whatsappReminders",
              ],
              [
                "إيميلات التقرير",
                profile.notifications.emailReports,
                "emailReports",
              ],
            ].map(([label, value, key]) => (
              <button
                key={String(key)}
                type="button"
                onClick={() =>
                  onNotificationToggle(
                    key as
                      | "projectUpdates"
                      | "whatsappReminders"
                      | "emailReports",
                    !value,
                  )
                }
                className={rowClassName}
              >
                <p className="text-sm font-semibold">{label}</p>
                <span
                  className={[
                    "relative inline-flex h-6 w-11 rounded-full border",
                    value
                      ? "border-primary bg-primary/80"
                      : "border-border bg-textSecondary/30",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                      value ? "left-[20px]" : "left-0.5",
                    ].join(" ")}
                  />
                </span>
              </button>
            ))}
          </SettingGroup>

          <SettingGroup title="المظهر">
            <button
              type="button"
              onClick={() => setDarkMode(!isDark)}
              className={rowClassName}
            >
              <div>
                <p className="text-sm font-semibold">الوضع الداكن</p>
                <p className="text-xs text-textSecondary">
                  غير مظهر التطبيق للوضع الداكن
                </p>
              </div>
              <span
                className={[
                  "relative inline-flex h-6 w-11 rounded-full border",
                  isDark
                    ? "border-primary bg-primary/80"
                    : "border-border bg-textSecondary/30",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                    isDark ? "left-[20px]" : "left-0.5",
                  ].join(" ")}
                />
              </span>
            </button>
          </SettingGroup>

          <SettingGroup title="الخصوصية">
            <button
              type="button"
              onClick={() =>
                onPrivacyToggle(
                  "showEmailOnProfile",
                  !profile.privacy.showEmailOnProfile,
                )
              }
              className={rowClassName}
            >
              <p className="text-sm font-semibold">إظهار الإيميل</p>
              <span
                className={[
                  "relative inline-flex h-6 w-11 rounded-full border",
                  profile.privacy.showEmailOnProfile
                    ? "border-primary bg-primary/80"
                    : "border-border bg-textSecondary/30",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                    profile.privacy.showEmailOnProfile
                      ? "left-[20px]"
                      : "left-0.5",
                  ].join(" ")}
                />
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                onPrivacyToggle(
                  "allowProjectShowcase",
                  !profile.privacy.allowProjectShowcase,
                )
              }
              className={rowClassName}
            >
              <div>
                <p className="text-sm font-semibold">السماح بعرض المشروع</p>
                <p className="text-xs text-textSecondary">
                  ممكن نستخدم موقعك كمثال لعملاء تانيين (بإذنك)
                </p>
              </div>
              <span
                className={[
                  "relative inline-flex h-6 w-11 rounded-full border",
                  profile.privacy.allowProjectShowcase
                    ? "border-primary bg-primary/80"
                    : "border-border bg-textSecondary/30",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                    profile.privacy.allowProjectShowcase
                      ? "left-[20px]"
                      : "left-0.5",
                  ].join(" ")}
                />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowSessions((prev) => !prev)}
              className={rowClassName}
            >
              <p className="text-sm font-semibold">الجلسات النشطة</p>
              <span className="text-xs text-textSecondary">
                {sessions.length}
              </span>
            </button>
            <AnimatePresence>
              {showSessions ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border bg-background/50"
                >
                  <div className="space-y-2 p-3">
                    {sessions.map((session) => (
                      <div
                        key={session.token}
                        className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
                      >
                        <p className="text-sm text-textPrimary">
                          {session.deviceLabel}
                        </p>
                        <p className="text-xs text-textSecondary">
                          {new Date(session.createdAt).toLocaleDateString(
                            "ar-EG",
                          )}
                        </p>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => askForPassword("logoutAll")}
                      className="mt-1 text-sm font-semibold text-error"
                    >
                      تسجيل الخروج من كل الأجهزة
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </SettingGroup>

          <SettingGroup title="الدعم">
            <a
              href={waHref}
              target={hasValidWaNumber ? "_blank" : undefined}
              rel={hasValidWaNumber ? "noreferrer" : undefined}
              className={rowClassName}
              aria-disabled={!hasValidWaNumber}
              onClick={(event) => {
                if (!hasValidWaNumber) {
                  event.preventDefault();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-[#25D366]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20.52 3.48A11.82 11.82 0 0012.08 0C5.5 0 .17 5.33.17 11.91c0 2.1.55 4.16 1.6 5.97L0 24l6.28-1.64a11.86 11.86 0 005.8 1.48h.01c6.58 0 11.91-5.33 11.91-11.91a11.8 11.8 0 00-3.48-8.45z" />
                </svg>
                <p className="text-sm font-semibold">تواصل معانا</p>
              </div>
              <span className="text-textSecondary">‹</span>
            </a>

            <button
              type="button"
              onClick={() => setShowFaq((prev) => !prev)}
              className={rowClassName}
            >
              <p className="text-sm font-semibold">الأسئلة الشائعة</p>
              <span className="text-textSecondary">{showFaq ? "▾" : "‹"}</span>
            </button>
            <AnimatePresence>
              {showFaq ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border bg-background/50"
                >
                  <div className="space-y-2 p-3">
                    {faqItems.map((item) => (
                      <div
                        key={item.q}
                        className="rounded-xl border border-border bg-card p-3"
                      >
                        <p className="text-sm font-semibold text-textPrimary">
                          {item.q}
                        </p>
                        <p className="mt-1 text-xs text-textSecondary">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => setShowRating(true)}
              className={rowClassName}
            >
              <div className="flex items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-accent"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z" />
                </svg>
                <p className="text-sm font-semibold">قيّم التطبيق</p>
              </div>
              <span className="text-textSecondary">‹</span>
            </button>

            <div className={rowClassName}>
              <p className="text-sm font-semibold">الإصدار</p>
              <span className="text-xs text-textSecondary">الإصدار 1.0.0</span>
            </div>
          </SettingGroup>

          <section>
            <p className="mb-2 px-1 text-xs font-medium text-error">
              منطقة الخطر
            </p>
            <div className="overflow-hidden rounded-xl border border-error/40 bg-card">
              <button
                type="button"
                onClick={() => askForPassword("delete")}
                className={rowClassName}
              >
                <p className="text-sm font-semibold text-error">
                  حذف الحساب والبيانات
                </p>
                <span className="text-error">‹</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      <EditProfileModal
        isOpen={modalOpen}
        identifier={identifier || currentUserEmail}
        initialProfile={initialProfile}
        initialTab={modalTab}
        onClose={() => setModalOpen(false)}
      />

      <AnimatePresence>
        {confirmAction ? (
          <>
            <motion.button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="fixed inset-0 z-40 bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              dir="rtl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 m-auto h-fit w-[92vw] max-w-sm rounded-2xl border border-border bg-card p-4"
            >
              <p className="font-heading text-lg font-bold text-textPrimary">
                تأكيد العملية
              </p>
              <p className="mt-1 text-sm text-textSecondary">
                اكتب كلمة المرور علشان نكمل
              </p>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setConfirmError("");
                }}
                className="mt-3 h-11 w-full rounded-xl border border-border bg-background px-3"
                autoComplete="current-password"
              />
              {confirmError ? (
                <p className="mt-2 text-sm text-error">{confirmError}</p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={runConfirmedAction}
                  className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white"
                >
                  تأكيد
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showRating ? (
          <>
            <motion.button
              type="button"
              onClick={() => setShowRating(false)}
              className="fixed inset-0 z-40 bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              dir="rtl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border border-border bg-card p-4"
            >
              <p className="font-heading text-lg font-bold">قيّم التطبيق</p>
              <p className="mt-1 text-sm text-textSecondary">
                تقييمك بيساعدنا نطوّر التجربة
              </p>
              <div className="mt-4 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="p-1"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={[
                        "h-8 w-8",
                        rating >= value ? "text-accent" : "text-border",
                      ].join(" ")}
                      fill="currentColor"
                    >
                      <path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z" />
                    </svg>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!rating) {
                    toast.error("اختار تقييم الأول");
                    return;
                  }
                  toast.success("شكراً على تقييمك");
                  setShowRating(false);
                }}
                className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
              >
                إرسال
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
