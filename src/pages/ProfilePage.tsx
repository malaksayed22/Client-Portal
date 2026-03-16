import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
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
import { parseIdentifier } from "../lib/buildIdentifier";
import { storageService } from "../lib/storageService";
import { clearClientLocalData } from "../lib/submissionStorage";
import { useAuthStore } from "../store/authStore";
import { useFormStore } from "../store/formStore";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

type ModalTab = "profile" | "security" | "contact" | "preferences";

const avatarPalette = [
  "#1B4FFF",
  "#FF6B35",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
];

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("read-error"));
    reader.readAsDataURL(file);
  });
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = useFormStore((state) => state.resetForm);
  const deleteCurrentAccount = useAuthStore(
    (state) => state.deleteCurrentAccount,
  );
  const verifyPassword = useAuthStore((state) => state.verifyPassword);
  const currentUserEmail =
    useAuthStore((state) => state.currentUserEmail) ?? "";
  const authUser = useAuthStore((state) => state.user);
  const userView = useAuthStore((state) => state.userView);
  const patchUserView = useAuthStore((state) => state.patchUserView);
  const signOut = useAuthStore((state) => state.signOut);
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);

  const { identifier, submission, profile, formattedDate, saveProfile } =
    useClientProfile();

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [pendingAvatarData, setPendingAvatarData] = useState("");
  const [didCelebrate, setDidCelebrate] = useState(false);

  const initialProfile = useMemo(
    () => buildInitialProfile(profile, currentUserEmail),
    [currentUserEmail, profile],
  );

  const displayName = profile.username || profile.fullName || "مستخدم";
  const shouldShowFullName = Boolean(
    profile.username && profile.username !== profile.fullName,
  );

  const avatarLabel =
    profile.username || profile.fullName || currentUserEmail || "مستخدم";
  const avatarColor =
    avatarPalette[hashName(avatarLabel) % avatarPalette.length];
  const avatarSrc = profile.avatar || profile.googlePhotoUrl || "";
  const businessName = profile.businessName || submission?.businessName || "";
  const bio = profile.bio?.trim() || "";
  const location = profile.location?.trim() || profile.contact.city || "";

  const stats = [
    {
      label: "حالة المشروع",
      value: submission?.status || "لم يبدأ بعد",
    },
    {
      label: "رقم الطلب",
      value: submission?.id.slice(0, 8) || "-",
    },
    {
      label: "عضو من",
      value: formattedDate || "الآن",
    },
  ];

  const completion = useMemo(() => {
    let score = 0;
    if (profile.fullName.trim()) score += 20;
    if (profile.contact.phone.trim()) score += 20;
    if (profile.businessName.trim()) score += 15;
    if (profile.businessType.trim()) score += 10;
    if (profile.avatar.trim() || profile.googlePhotoUrl.trim()) score += 15;
    if (profile.bio.trim()) score += 10;
    if (profile.contact.email.trim()) score += 10;
    return Math.min(score, 100);
  }, [
    profile.avatar,
    profile.bio,
    profile.businessName,
    profile.businessType,
    profile.contact.email,
    profile.contact.phone,
    profile.fullName,
    profile.googlePhotoUrl,
  ]);

  const missingItems = useMemo(() => {
    const items: Array<{ label: string; tab: ModalTab }> = [];
    if (!profile.fullName.trim())
      items.push({ label: "أضف اسمك", tab: "profile" });
    if (!profile.contact.phone.trim())
      items.push({ label: "أضف رقمك", tab: "contact" });
    if (!profile.businessName.trim())
      items.push({ label: "أضف اسم الشركة", tab: "profile" });
    if (!profile.businessType.trim())
      items.push({ label: "أضف نوع النشاط", tab: "profile" });
    if (!profile.avatar.trim() && !profile.googlePhotoUrl.trim())
      items.push({ label: "أضف صورة", tab: "profile" });
    if (!profile.bio.trim()) items.push({ label: "أضف بايو", tab: "profile" });
    if (!profile.contact.email.trim())
      items.push({ label: "أضف إيميل", tab: "contact" });
    return items;
  }, [
    profile.avatar,
    profile.bio,
    profile.businessName,
    profile.businessType,
    profile.contact.email,
    profile.contact.phone,
    profile.fullName,
    profile.googlePhotoUrl,
  ]);

  useEffect(() => {
    if (completion === 100 && !didCelebrate) {
      toast.success("ملفك الشخصي اكتمل! 🎉");
      setDidCelebrate(true);
      return;
    }

    if (completion < 100 && didCelebrate) {
      setDidCelebrate(false);
    }
  }, [completion, didCelebrate]);

  const openEditModal = (tab: ModalTab) => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const onAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
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
      const encoded = await fileToDataUrl(file);
      setPendingAvatarData(encoded);
      setAvatarPreview(encoded);
    } catch {
      toast.error("حصلت مشكلة أثناء قراءة الصورة");
    } finally {
      event.target.value = "";
    }
  };

  const confirmAvatar = () => {
    if (!pendingAvatarData || !identifier) {
      return;
    }

    void saveProfile({ avatar: pendingAvatarData });
    patchUserView({ avatar: pendingAvatarData });
    toast.success("اتغيرت الصورة بنجاح");
    setPendingAvatarData("");
    setAvatarPreview("");
  };

  const handleDeleteData = async () => {
    if (!deletePassword.trim()) {
      setDeletePasswordError("اكتب كلمة المرور الأول");
      return;
    }

    const isValidPassword = await verifyPassword(deletePassword);
    if (!isValidPassword) {
      setDeletePasswordError("كلمة المرور غير صحيحة");
      return;
    }

    if (submission?.phone) {
      clearClientLocalData(submission.phone);
    }
    const deleted = deleteCurrentAccount();
    if (!deleted.ok) {
      toast.error(deleted.message || "ماقدرناش نحذف الحساب");
      return;
    }

    resetForm();
    toast.success("اتمسح كل حاجة بنجاح");
    setDeletePassword("");
    setDeletePasswordError("");
    navigate("/signin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary" dir="rtl">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="relative"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full border-[3px] border-white object-cover shadow-[0_12px_24px_rgba(15,15,19,0.18)] sm:h-24 sm:w-24 dark:border-[#2D2D3D]"
                />
              ) : (
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white text-2xl font-bold text-white shadow-[0_12px_24px_rgba(15,15,19,0.18)] sm:h-24 sm:w-24 sm:text-3xl dark:border-[#2D2D3D]"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getInitials(avatarLabel)}
                </div>
              )}
            </motion.div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-textSecondary underline-offset-2 hover:underline"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 8h2l1-2h4l1 2h2a2 2 0 012 2v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
              تغيير الصورة
            </button>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.24 }}
              className="group mt-4"
            >
              <button
                type="button"
                onClick={() => openEditModal("profile")}
                className="inline-flex items-center gap-1 text-center font-heading text-lg font-bold text-textPrimary sm:text-[20px]"
              >
                <span>{displayName}</span>
                <span className="opacity-0 transition-opacity group-hover:opacity-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 text-textSecondary"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 20h4l10-10-4-4L4 16v4z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </span>
              </button>
            </motion.div>

            {shouldShowFullName ? (
              <p className="mt-1 text-sm text-textSecondary">
                {profile.fullName}
              </p>
            ) : null}

            <motion.button
              type="button"
              onClick={() => openEditModal("profile")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.24 }}
              className="group mt-1 inline-flex items-center gap-1 text-sm text-textSecondary"
            >
              <span>{businessName || "أضف اسم الشركة"}</span>
              <span className="opacity-0 transition-opacity group-hover:opacity-100">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 20h4l10-10-4-4L4 16v4z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
            </motion.button>

            {bio ? (
              <p className="mt-2 line-clamp-2 max-w-xl text-[13px] italic text-textSecondary">
                {bio}
              </p>
            ) : null}

            {location ? (
              <p className="mt-2 inline-flex items-center gap-1 text-[12px] text-textSecondary">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 21s6-5.1 6-11a6 6 0 10-12 0c0 5.9 6 11 6 11z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle
                    cx="12"
                    cy="10"
                    r="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                {location}
              </p>
            ) : null}

            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="mt-5"
            >
              <button
                type="button"
                onClick={() => openEditModal("profile")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-textPrimary sm:w-auto dark:border-white/40"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 20h4l10-10-4-4L4 16v4z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                تعديل الملف الشخصي
              </button>
            </motion.div>

            <div className="mt-5 flex w-full max-w-xl flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-textPrimary"
              >
                الإعدادات
              </button>
              <button
                type="button"
                onClick={() => navigate("/tracker")}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-textPrimary"
              >
                تتبع المشروع
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                ابدأ مشروع جديد
              </button>
            </div>

            <div className="mt-6 grid w-full max-w-xl grid-cols-3 gap-2 sm:gap-3">
              {stats.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 + index * 0.08, duration: 0.24 }}
                  className="rounded-xl border border-border bg-background p-2.5 text-center"
                >
                  <p className="text-[11px] text-textSecondary">{item.label}</p>
                  <p className="mt-1 text-xs font-semibold text-textPrimary sm:text-sm">
                    {item.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {completion < 100 ? (
          <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-textPrimary">
                اكتمال الملف الشخصي: {completion}%
              </p>
              <button
                type="button"
                onClick={() => openEditModal("profile")}
                className="text-xs font-semibold text-primary"
              >
                أكمل الآن
              </button>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <p className="mt-2 text-sm text-textSecondary">
              أكمل ملفك الشخصي عشان تحسن تجربتك
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {missingItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => openEditModal(item.tab)}
                  className="inline-flex w-[calc(50%-0.25rem)] items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-textSecondary sm:w-auto sm:px-3 sm:text-xs"
                >
                  <span className="text-primary">+</span>
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {completion === 100 ? (
          <section className="relative mt-5 overflow-hidden rounded-2xl border border-success/30 bg-success/10 p-4">
            <p className="font-semibold text-success">الملف مكتمل 100%</p>
            <p className="mt-1 text-sm text-textSecondary">
              شغلك ممتاز ومعلوماتك كاملة
            </p>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[8%] top-0 h-2 w-2 animate-bounce rounded-full bg-primary" />
              <div className="absolute left-[24%] top-2 h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:120ms]" />
              <div className="absolute left-[42%] top-1 h-2 w-2 animate-bounce rounded-full bg-success [animation-delay:200ms]" />
              <div className="absolute left-[60%] top-2 h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
              <div className="absolute left-[78%] top-1 h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:420ms]" />
            </div>
          </section>
        ) : null}

        <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-textPrimary">
            معلومات الحساب
          </h2>
          <p className="mt-2 text-sm text-textSecondary">{currentUserEmail}</p>
          {userView?.businessName ? (
            <p className="mt-1 text-sm text-textSecondary">
              {userView.businessName}
            </p>
          ) : null}
        </section>

        <section className="mt-5 rounded-2xl border border-red-200 bg-card p-4 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-red-600">
            منطقة الخطر
          </h2>
          <p className="mt-2 text-sm text-textSecondary">
            هيمسح بيانات المشروع والحساب من الجهاز ده.
          </p>
          <button
            type="button"
            onClick={() => {
              setDeletePassword("");
              setDeletePasswordError("");
              setShowDeleteConfirm(true);
            }}
            className="mt-3 rounded-xl border border-red-400 px-4 py-2 font-semibold text-red-600"
          >
            مسح كل البيانات
          </button>
        </section>
      </main>

      <EditProfileModal
        isOpen={isModalOpen}
        identifier={identifier || currentUserEmail}
        initialProfile={initialProfile}
        initialTab={modalTab}
        onClose={() => setIsModalOpen(false)}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onAvatarSelect}
      />

      <AnimatePresence>
        {avatarPreview ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70"
              onClick={() => {
                setAvatarPreview("");
                setPendingAvatarData("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 m-auto h-fit w-[92vw] max-w-sm rounded-2xl border border-border bg-card p-4"
              dir="rtl"
            >
              <p className="font-semibold text-textPrimary">معاينة الصورة</p>
              <img
                src={avatarPreview}
                alt="preview"
                className="mt-3 h-56 w-full rounded-xl object-cover"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={confirmAvatar}
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

      <AnimatePresence>
        {showDeleteConfirm ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 m-auto h-fit w-[92%] max-w-md rounded-2xl border border-border bg-card p-5"
              dir="rtl"
            >
              <h3 className="font-heading text-xl font-bold">متأكد</h3>
              <p className="mt-2 text-sm text-textSecondary">
                هيتمسح كل حاجة من الجهاز ده.
              </p>
              <label className="mt-4 block text-sm font-semibold text-textPrimary">
                اكتب كلمة المرور للتأكيد
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => {
                  setDeletePassword(event.target.value);
                  setDeletePasswordError("");
                }}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3"
                autoComplete="current-password"
              />
              {deletePasswordError ? (
                <p className="mt-2 text-sm text-error">{deletePasswordError}</p>
              ) : null}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteData}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white"
                >
                  آه امسح كل حاجة
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-3 font-semibold"
                >
                  لا رجوع
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
