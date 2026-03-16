import { Suspense, lazy, useEffect } from "react";
import toast from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthGuard } from "./components/guards/AuthGuard";
import { FormGuard } from "./components/guards/FormGuard";
import { SyncLoader } from "./components/ui/SyncLoader";
import { useDarkMode } from "./hooks/useDarkMode";
import { defaultProfileSettings } from "./types/settings.types";
import { defaultProfileData } from "./types/profile.types";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { storageService } from "./lib/storageService";
import { syncService } from "./lib/syncService";
import { useAuthStore } from "./store/authStore";
import HomePage from "./pages/HomePage";

const TrackerPage = lazy(() => import("./pages/TrackerPage"));
const SubmissionSuccessPage = lazy(
  () => import("./pages/SubmissionSuccessPage"),
);
const StartProjectPage = lazy(() => import("./pages/StartProjectPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const MIGRATION_KEY = "cp_supabase_migration_done";

const isEmptyProfile = (profile: typeof defaultProfileData) => {
  const candidate = {
    ...profile,
    createdAt: "",
    updatedAt: "",
  };

  const defaults = {
    ...defaultProfileData,
    createdAt: "",
    updatedAt: "",
  };

  return JSON.stringify(candidate) === JSON.stringify(defaults);
};

const isDefaultSettings = (settings: typeof defaultProfileSettings) => {
  return JSON.stringify(settings) === JSON.stringify(defaultProfileSettings);
};

function App() {
  useDarkMode();
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute("content") ?? "";

    const handleFocus = () => {
      meta?.setAttribute(
        "content",
        `${original}, height=${window.innerHeight}`,
      );
    };

    const handleBlur = () => {
      meta?.setAttribute("content", original);
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);

    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      void syncService.processSyncQueue();
      toast.success("رجع الإنترنت — جاري المزامنة");
    };

    const handleOffline = () => {
      toast.error("مفيش إنترنت — هتتحفظ البيانات لما يرجع", {
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    void syncService.processSyncQueue();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const migrateLocalDataToSupabase = async () => {
      if (!isSupabaseConfigured || !supabase) {
        return;
      }

      if (localStorage.getItem(MIGRATION_KEY) === "true") {
        return;
      }

      const identifiers = storageService.getAllIdentifiers();
      for (const identifier of identifiers) {
        if (cancelled) {
          return;
        }

        const profileFromMeta = storageService.get<typeof defaultProfileData>(
          identifier,
          "profile",
        );
        const profile =
          profileFromMeta ?? storageService.getProfile(identifier);

        if (!profile || isEmptyProfile(profile)) {
          continue;
        }

        const { data } = await supabase
          .from("users")
          .select("identifier")
          .eq("identifier", identifier)
          .maybeSingle<{ identifier: string }>();

        if (!data) {
          await syncService.saveUser(identifier, profile);

          const submission = storageService.get(identifier, "submission");
          if (submission) {
            await syncService.saveSubmission(
              identifier,
              submission as Parameters<typeof syncService.saveSubmission>[1],
            );
          }

          const settings = storageService.get<typeof defaultProfileSettings>(
            identifier,
            "settings",
          );
          if (settings && !isDefaultSettings(settings)) {
            await syncService.saveSettings(identifier, settings);
          }
        }
      }

      if (!cancelled) {
        localStorage.setItem(MIGRATION_KEY, "true");
      }
    };

    void migrateLocalDataToSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <SyncLoader active={isLoading} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/form"
            element={
              <AuthGuard>
                <FormGuard>
                  <HomePage />
                </FormGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/submitted"
            element={
              <Suspense fallback={<div className="p-6 text-center">...</div>}>
                <SubmissionSuccessPage />
              </Suspense>
            }
          />
          <Route
            path="/start"
            element={
              <Suspense fallback={<div className="p-6 text-center">...</div>}>
                <AuthGuard>
                  <StartProjectPage />
                </AuthGuard>
              </Suspense>
            }
          />
          <Route
            path="/tracker"
            element={
              <Suspense fallback={<div className="p-6 text-center">...</div>}>
                <AuthGuard>
                  <TrackerPage />
                </AuthGuard>
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<div className="p-6 text-center">...</div>}>
                <AuthGuard>
                  <ProfilePage />
                </AuthGuard>
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<div className="p-6 text-center">...</div>}>
                <AuthGuard>
                  <SettingsPage />
                </AuthGuard>
              </Suspense>
            }
          />
          <Route
            path="/signin"
            element={
              <Suspense fallback={<div className="p-6 text-center">...</div>}>
                <AuthPage />
              </Suspense>
            }
          />
          <Route path="/auth" element={<Navigate to="/signin" replace />} />
          <Route
            path="*"
            element={
              <main
                className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8 text-center"
                dir="rtl"
              >
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                  <h1 className="font-heading text-3xl font-bold text-textPrimary">
                    الصفحة دي مش موجودة
                  </h1>
                  <p className="mt-2 text-textSecondary">
                    الرابط غير صحيح أو اتحذف.
                  </p>
                  <a
                    href="/"
                    className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white"
                  >
                    ارجع للرئيسية
                  </a>
                </div>
              </main>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
