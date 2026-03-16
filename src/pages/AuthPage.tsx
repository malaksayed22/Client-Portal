import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  GoogleSignInButton,
  type GoogleUser,
} from "../components/ui/GoogleSignInButton";
import { parseIdentifier } from "../lib/buildIdentifier";
import { storageService } from "../lib/storageService";
import { getLastSubmissionPhone } from "../lib/submissionStorage";
import { useAuthStore } from "../store/authStore";
import { useFormStore } from "../store/formStore";

type AuthMode = "signin" | "signup";

type AuthLocationState = {
  from?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const signOut = useAuthStore((state) => state.signOut);
  const isLoading = useAuthStore((state) => state.isLoading);
  const currentUserEmail = useAuthStore((state) => state.currentUserEmail);
  const authToken = useAuthStore((state) => state.authToken);
  const resetForm = useFormStore((state) => state.resetForm);

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignInShortcut, setShowSignInShortcut] = useState(false);

  const authFrom = (location.state as AuthLocationState | null)?.from;
  const hasExistingSubmission = Boolean(getLastSubmissionPhone());
  const hasGoogleClientId = Boolean(
    import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim(),
  );
  const defaultPath = hasExistingSubmission ? "/tracker" : "/";
  const nextPath = authFrom ?? defaultPath;

  if (currentUserEmail && authToken) {
    return <Navigate to={defaultPath} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!emailRegex.test(email.trim())) {
      toast.error("اكتب إيميل صحيح");
      return;
    }

    if (password.trim().length < 6) {
      toast.error("كلمة المرور لازم تكون 6 حروف على الأقل");
      return;
    }

    const result = await (async () => {
      if (mode === "signin") {
        return signIn(email, password);
      }

      signOut();
      resetForm();
      return signUp(email, password);
    })();

    if (!result.ok) {
      toast.error(result.message ?? "تعذر تنفيذ العملية");
      setShowSignInShortcut(
        Boolean(result.message?.includes("سجل دخولك") && mode === "signup"),
      );
      return;
    }

    setShowSignInShortcut(false);

    toast.success(mode === "signin" ? "تم تسجيل الدخول" : "تم إنشاء الحساب");
    navigate(nextPath, { replace: true });
  };

  const handleGoogleSuccess = async (googleUser: GoogleUser) => {
    const result = await signInWithGoogle(googleUser);
    if (!result.ok) {
      toast.error(result.message ?? "مش قدرنا نكمل مع جوجل — حاول تاني");
      return;
    }

    toast.success(`أهلاً ${googleUser.name.split(" ")[0]}!`);

    const activeIdentifier = storageService.getActiveIdentifier();
    const hasSubmission = activeIdentifier
      ? storageService.hasSubmission(activeIdentifier)
      : false;
    navigate(hasSubmission ? "/tracker" : "/", { replace: true });
  };

  const handleGoogleError = () => {
    toast.error("مش قدرنا نكمل مع جوجل — حاول تاني");
  };

  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-md items-stretch px-0 py-0 sm:items-center sm:px-6 sm:py-8"
      dir="rtl"
    >
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex w-full flex-col justify-center rounded-none border-0 bg-card px-6 py-8 shadow-none sm:rounded-2xl sm:border sm:border-border sm:p-6 sm:shadow-sm"
      >
        <h1 className="font-heading text-2xl font-bold text-textPrimary">
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}
        </h1>
        <p className="mt-2 text-sm text-textSecondary">
          {mode === "signin"
            ? "ادخل بالإيميل وكلمة المرور للوصول لملفك الشخصي"
            : "اعمل حساب جديد علشان تقدر تدخل لملفك الشخصي"}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-textPrimary">
              الإيميل
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="h-12 w-full rounded-xl border border-border bg-background px-3"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-textPrimary">
              كلمة المرور
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              className="h-12 w-full rounded-xl border border-border bg-background px-3"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 h-12 w-full rounded-xl bg-primary px-4 font-semibold text-white"
          >
            {isLoading
              ? "جاري المزامنة..."
              : mode === "signin"
                ? "دخول"
                : "إنشاء الحساب"}
          </button>
        </form>

        {hasGoogleClientId ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                margin: "20px 0",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "rgb(var(--color-border))",
                }}
              />
              <span
                style={{
                  fontSize: "13px",
                  color: "rgb(var(--color-text-secondary))",
                }}
              >
                أو
              </span>
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "rgb(var(--color-border))",
                }}
              />
            </div>

            <GoogleSignInButton
              label={
                isLoading
                  ? "جاري المزامنة..."
                  : mode === "signin"
                    ? "الدخول بحساب جوجل"
                    : "التسجيل بحساب جوجل"
              }
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </>
        ) : null}

        <button
          type="button"
          onClick={() =>
            setMode((prev) => (prev === "signin" ? "signup" : "signin"))
          }
          className="mt-4 text-sm font-semibold text-primary"
        >
          {mode === "signin"
            ? "مفيش حساب؟ اعمل حساب جديد"
            : "عندك حساب بالفعل؟ سجل دخول"}
        </button>

        {showSignInShortcut ? (
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              const parsed = parseIdentifier(currentUserEmail ?? "");
              if (parsed.method === "email") {
                setEmail(parsed.value);
              }
            }}
            className="mt-2 text-sm font-semibold text-primary underline"
          >
            سجل دخولك
          </button>
        ) : null}
      </motion.section>
    </main>
  );
};

export default AuthPage;
