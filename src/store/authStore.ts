import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  deleteAuthUser,
  getAuthUserByEmail,
  getAuthUserByIdentifier,
  registerOrUpdateGoogleAuthUser,
  registerAuthUser,
  updatePassword,
  validateAuthCredentials,
} from "../lib/authStorage";
import { buildIdentifier, parseIdentifier } from "../lib/buildIdentifier";
import { getSubmission } from "../lib/submissionStorage";
import { storageService } from "../lib/storageService";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { syncService } from "../lib/syncService";
import {
  defaultProfileData,
  type ProfileAuthProvider,
} from "../types/profile.types";
import { useFormStore } from "./formStore";

type AuthResult = {
  ok: boolean;
  message?: string;
};

type AuthUserView = {
  displayName: string;
  fullName: string;
  avatar: string;
  businessName: string;
  identifier: string;
  authProvider: ProfileAuthProvider;
};

export type GoogleUser = {
  googleId: string;
  name: string;
  email: string;
  picture: string;
};

type AuthStore = {
  currentUserEmail: string | null;
  authToken: string | null;
  isLoading: boolean;
  userView: AuthUserView | null;
  user: {
    name: string | null;
    phone: string | null;
    email: string | null;
    businessName: string | null;
  } | null;
  signInMethod: "phone" | "google" | "email" | null;
  isGoogleUser: boolean;
  googleProfile: GoogleUser | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: (googleUser: GoogleUser) => Promise<AuthResult>;
  signOut: () => void;
  verifyPassword: (password: string) => Promise<boolean>;
  changePassword: (
    currentPassword: string,
    nextPassword: string,
  ) => Promise<AuthResult>;
  refreshUserView: () => void;
  patchUserView: (input: Partial<AuthUserView>) => void;
  syncFromStorage: (identifier: string) => void;
  deleteCurrentAccount: () => AuthResult;
};

const AUTH_TOKEN_KEY = "client-auth-token";
const initialState = {
  currentUserEmail: null,
  authToken: null,
  isLoading: false,
  userView: null,
  user: null,
  signInMethod: null,
  isGoogleUser: false,
  googleProfile: null,
} as const;

const toIdentifier = (value: string | null) => {
  const candidate = value?.trim() ?? "";
  if (!candidate) {
    return "";
  }

  if (/^(email|phone|google)_/.test(candidate)) {
    const parsed = parseIdentifier(candidate);
    if (parsed.method === "phone") {
      return buildIdentifier("phone", parsed.value);
    }
    if (parsed.method === "google") {
      return buildIdentifier("google", parsed.value);
    }
    return buildIdentifier("email", parsed.value);
  }

  return buildIdentifier("email", candidate);
};

const createUserView = (rawIdentifier: string | null): AuthUserView | null => {
  const identifier = toIdentifier(rawIdentifier);
  if (!identifier) {
    return null;
  }

  const profile = storageService.getProfile(identifier);
  const authUser =
    getAuthUserByIdentifier(identifier) ?? getAuthUserByEmail(identifier);
  const parsed = parseIdentifier(identifier);
  const fallbackName =
    parsed.method === "email"
      ? parsed.value.split("@")[0] || "مستخدم"
      : parsed.value || "مستخدم";
  const fullName = profile.fullName || fallbackName;
  const displayName = profile.username || fullName;

  return {
    displayName,
    fullName,
    avatar: profile.avatar,
    businessName: profile.businessName,
    identifier,
    authProvider: profile.authProvider || authUser?.provider || "email",
  };
};

const createAuthToken = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `token_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const extractEmailFromIdentifier = (identifier: string) => {
  const parsed = parseIdentifier(identifier);
  if (parsed.method !== "email") {
    return "";
  }

  return parsed.value.toLowerCase().trim();
};

const mapSupabaseAuthError = (fallback: string, message?: string | null) => {
  const lower = (message ?? "").toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "الإيميل أو كلمة السر غلط";
  }
  if (lower.includes("email not confirmed")) {
    return "أكد الإيميل الأول وبعدين سجل دخول";
  }
  if (lower.includes("already registered")) {
    return "الإيميل ده عنده حساب بالفعل — سجل دخولك";
  }

  return fallback;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      signIn: async (email, password) => {
        const emailIdentifier = buildIdentifier("email", email);
        if (!emailIdentifier || !password.trim()) {
          return { ok: false, message: "اكتب الإيميل وكلمة المرور" };
        }

        set({ ...initialState, isLoading: true });

        let authToken = createAuthToken();

        if (isSupabaseConfigured && supabase) {
          const emailValue = extractEmailFromIdentifier(emailIdentifier);
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email: emailValue,
              password,
            });

          if (authError || !authData.session) {
            set({ isLoading: false });
            return {
              ok: false,
              message: mapSupabaseAuthError(
                "الإيميل أو كلمة السر غلط",
                authError?.message,
              ),
            };
          }

          authToken = authData.session.access_token || authToken;
        } else {
          const valid = validateAuthCredentials(emailIdentifier, password);
          if (!valid) {
            set({ isLoading: false });
            return { ok: false, message: "الإيميل أو كلمة السر غلط" };
          }
        }

        let canonicalIdentifier = emailIdentifier;

        if (isSupabaseConfigured && supabase) {
          const emailValue = parseIdentifier(emailIdentifier).value;
          const { data, error } = await supabase
            .from("users")
            .select("identifier, email")
            .or(
              `identifier.eq.${emailIdentifier},email.eq.${emailValue.toLowerCase()}`,
            )
            .limit(1);

          if (!error && data && data.length > 0 && data[0].identifier) {
            canonicalIdentifier = toIdentifier(data[0].identifier);
          }
        }

        const profile = storageService.getProfile(canonicalIdentifier);
        const localSubmission =
          storageService.get<{ id?: string }>(
            canonicalIdentifier,
            "submission",
          ) ??
          (profile.contact.phone
            ? (getSubmission(profile.contact.phone) as { id?: string } | null)
            : null);
        const formProgress = storageService.get<{
          currentStep?: number;
          formData?: ReturnType<typeof useFormStore.getState>["formData"];
          savedAt?: string;
        }>(canonicalIdentifier, "formProgress");

        storageService.setActiveSession(canonicalIdentifier);
        localStorage.setItem(AUTH_TOKEN_KEY, authToken);
        storageService.registerSession(canonicalIdentifier, authToken);

        const synced = await syncService.syncOnSignIn(canonicalIdentifier);

        const submission =
          (synced.submission as { id?: string } | null) ?? localSubmission;
        const syncedProfile = storageService.getProfile(canonicalIdentifier);

        const userView = createUserView(canonicalIdentifier);
        const idInfo = parseIdentifier(canonicalIdentifier);
        set({
          currentUserEmail: canonicalIdentifier,
          authToken,
          isLoading: false,
          userView,
          user: {
            name: syncedProfile.fullName || null,
            phone: syncedProfile.contact.phone || null,
            email:
              syncedProfile.contact.email ||
              (idInfo.method === "email" ? idInfo.value : null),
            businessName: syncedProfile.businessName || null,
          },
          signInMethod: idInfo.method === "google" ? "google" : "email",
          isGoogleUser: idInfo.method === "google",
          googleProfile:
            idInfo.method === "google"
              ? storageService.get<GoogleUser>(
                  canonicalIdentifier,
                  "googleData",
                )
              : null,
        });

        if (submission?.id) {
          storageService.save(canonicalIdentifier, "submission", submission);
        }

        if (submission?.id) {
          useFormStore.getState().lockForm(submission.id as string);
        } else if (formProgress?.formData) {
          useFormStore.getState().restoreProgress(formProgress);
        } else {
          useFormStore.getState().resetForm();
        }

        void syncService.processSyncQueue();

        return { ok: true };
      },
      signUp: async (email, password) => {
        const identifier = buildIdentifier("email", email);
        const normalizedEmail = parseIdentifier(identifier).value;
        if (!identifier || !password.trim()) {
          return { ok: false, message: "اكتب الإيميل وكلمة المرور" };
        }

        if (password.length < 6) {
          return {
            ok: false,
            message: "كلمة المرور لازم تكون 6 حروف على الأقل",
          };
        }

        let authToken = createAuthToken();

        if (isSupabaseConfigured && supabase) {
          const { data: signUpData, error: signUpError } =
            await supabase.auth.signUp({
              email: normalizedEmail,
              password,
            });

          if (signUpError) {
            return {
              ok: false,
              message: mapSupabaseAuthError(
                "تعذر إنشاء الحساب",
                signUpError.message,
              ),
            };
          }

          if (signUpData.session) {
            authToken = signUpData.session.access_token || authToken;
          } else {
            const { data: signInData, error: signInError } =
              await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
              });

            if (signInError || !signInData.session) {
              return {
                ok: false,
                message: mapSupabaseAuthError(
                  "تم إنشاء الحساب — فعل الإيميل ثم سجل دخول",
                  signInError?.message,
                ),
              };
            }

            authToken = signInData.session.access_token || authToken;
          }

          const { data, error } = await supabase
            .from("users")
            .select("identifier, email")
            .or(
              `identifier.eq.${identifier},identifier.eq.${normalizedEmail},email.eq.${normalizedEmail}`,
            )
            .limit(1);

          if (!error && data && data.length > 0) {
            return {
              ok: false,
              message: "الإيميل ده عنده حساب بالفعل — سجل دخولك",
            };
          }
        } else {
          const result = registerAuthUser(identifier, password);
          if (!result.ok) {
            return result;
          }
        }

        set({ ...initialState, isLoading: true });
        useFormStore.getState().resetForm();

        localStorage.setItem(AUTH_TOKEN_KEY, authToken);

        const profile = storageService.getProfile(identifier);
        storageService.saveProfile(identifier, {
          ...defaultProfileData,
          ...profile,
          contact: {
            ...defaultProfileData.contact,
            ...profile.contact,
            email: normalizedEmail,
          },
          authProvider: profile.authProvider || "email",
        });

        storageService.setActiveSession(identifier);
        storageService.registerSession(identifier, authToken);
        await syncService.saveUser(
          identifier,
          storageService.getProfile(identifier),
        );
        const userView = createUserView(identifier);
        set({
          currentUserEmail: identifier,
          authToken,
          isLoading: false,
          userView,
          user: {
            name: profile.fullName || null,
            phone: profile.contact.phone || null,
            email: normalizedEmail,
            businessName: profile.businessName || null,
          },
          signInMethod: "email",
          isGoogleUser: false,
          googleProfile: null,
        });
        void syncService.processSyncQueue();
        return { ok: true };
      },
      signInWithGoogle: async (googleUser) => {
        const googleIdentifier = buildIdentifier("google", googleUser.googleId);
        const normalizedEmail = googleUser.email.toLowerCase().trim();
        set({ ...initialState, isLoading: true });

        let canonicalIdentifier = googleIdentifier;

        if (isSupabaseConfigured && supabase) {
          const { data: existingGoogle } = await supabase
            .from("users")
            .select("identifier")
            .eq("identifier", googleIdentifier)
            .maybeSingle<{ identifier: string }>();

          if (existingGoogle?.identifier) {
            canonicalIdentifier = toIdentifier(existingGoogle.identifier);
          } else {
            const { data: emailMatch } = await supabase
              .from("users")
              .select("identifier")
              .eq("email", normalizedEmail)
              .maybeSingle<{ identifier: string }>();

            if (emailMatch?.identifier) {
              canonicalIdentifier = toIdentifier(emailMatch.identifier);
              await supabase
                .from("users")
                .update({
                  google_id: googleUser.googleId,
                  google_picture: googleUser.picture,
                  updated_at: new Date().toISOString(),
                })
                .eq("identifier", canonicalIdentifier);
            } else {
              await supabase.from("users").insert({
                identifier: googleIdentifier,
                auth_method: "google",
                name: googleUser.name,
                email: normalizedEmail,
                google_id: googleUser.googleId,
                google_picture: googleUser.picture,
                created_at: new Date().toISOString(),
              });
            }
          }
        }

        const result = registerOrUpdateGoogleAuthUser({
          ...googleUser,
          identifier: canonicalIdentifier,
        });
        if (!result.ok) {
          return { ok: false, message: result.message ?? "تعذر تسجيل الدخول" };
        }

        const profile = storageService.getProfile(canonicalIdentifier);
        const localSubmission =
          storageService.get<{ id?: string }>(
            canonicalIdentifier,
            "submission",
          ) ??
          (profile.contact.phone
            ? (getSubmission(profile.contact.phone) as { id?: string } | null)
            : null);
        const token = createAuthToken();
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        storageService.saveProfile(canonicalIdentifier, {
          ...defaultProfileData,
          ...profile,
          fullName: profile.fullName || googleUser.name,
          authProvider: "google",
          googleId: googleUser.googleId,
          googlePhotoUrl: googleUser.picture,
          contact: {
            ...defaultProfileData.contact,
            ...profile.contact,
            email: googleUser.email,
          },
        });

        storageService.save(canonicalIdentifier, "authMethod", "google");
        storageService.save(canonicalIdentifier, "googleData", googleUser);
        storageService.setActiveSession(canonicalIdentifier);
        storageService.registerSession(canonicalIdentifier, token);

        await syncService.saveUser(
          canonicalIdentifier,
          storageService.getProfile(canonicalIdentifier),
        );
        const synced = await syncService.syncOnSignIn(canonicalIdentifier);
        const submission =
          (synced.submission as { id?: string } | null) ?? localSubmission;
        const syncedProfile = storageService.getProfile(canonicalIdentifier);

        const userView = createUserView(canonicalIdentifier);
        set({
          currentUserEmail: canonicalIdentifier,
          authToken: token,
          isLoading: false,
          userView,
          user: {
            name: syncedProfile.fullName || googleUser.name || null,
            phone: syncedProfile.contact.phone || null,
            email: googleUser.email,
            businessName: syncedProfile.businessName || null,
          },
          signInMethod: "google",
          isGoogleUser: true,
          googleProfile: googleUser,
        });

        if (submission?.id) {
          storageService.save(canonicalIdentifier, "submission", submission);
        }

        if (submission?.id) {
          useFormStore.getState().lockForm(submission.id as string);
        } else {
          useFormStore.getState().resetForm();
        }

        void syncService.processSyncQueue();

        return { ok: true };
      },
      signOut: () => {
        const identifier = storageService.getActiveIdentifier();
        const { authToken: token } = get();

        if (identifier) {
          const currentState = get();
          if (currentState.user) {
            storageService.save(identifier, "profile", currentState.user);
          }
        }

        if (token) {
          storageService.removeSessionByToken(token);
        }

        if (isSupabaseConfigured && supabase) {
          void supabase.auth.signOut();
        }

        storageService.clearActiveSession();
        localStorage.removeItem("cp_active_session");
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem("auth_google_profile");
        localStorage.removeItem("auth_sign_in_method");
        localStorage.removeItem("lastSubmissionPhone");
        set({
          currentUserEmail: null,
          authToken: null,
          userView: null,
          user: null,
          signInMethod: null,
          isGoogleUser: false,
          googleProfile: null,
          isLoading: false,
        });
      },
      verifyPassword: async (password) => {
        const activeIdentifier = get().currentUserEmail;
        if (!activeIdentifier) {
          return false;
        }

        if (isSupabaseConfigured && supabase) {
          const email = extractEmailFromIdentifier(activeIdentifier);
          if (email) {
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            return !error;
          }
        }

        return validateAuthCredentials(activeIdentifier, password);
      },
      changePassword: async (currentPassword, nextPassword) => {
        const activeIdentifier = get().currentUserEmail;
        if (!activeIdentifier) {
          return { ok: false, message: "الحساب غير موجود" };
        }

        if (isSupabaseConfigured && supabase) {
          const email = extractEmailFromIdentifier(activeIdentifier);
          if (!email) {
            return {
              ok: false,
              message: "تغيير كلمة السر متاح لحساب الإيميل فقط",
            };
          }

          const { error: reauthError } = await supabase.auth.signInWithPassword(
            {
              email,
              password: currentPassword,
            },
          );
          if (reauthError) {
            return { ok: false, message: "كلمة السر الحالية غلط" };
          }

          const { error: updateError } = await supabase.auth.updateUser({
            password: nextPassword,
          });
          if (updateError) {
            return {
              ok: false,
              message: mapSupabaseAuthError(
                "ماقدرناش نغير كلمة السر",
                updateError.message,
              ),
            };
          }

          return { ok: true };
        }

        return updatePassword(activeIdentifier, currentPassword, nextPassword);
      },
      refreshUserView: () => {
        const activeIdentifier = get().currentUserEmail;
        const nextView = createUserView(activeIdentifier);
        set({
          userView: nextView,
          user: nextView
            ? {
                name: nextView.fullName || null,
                phone:
                  storageService.getProfile(nextView.identifier).contact
                    .phone || null,
                email:
                  storageService.getProfile(nextView.identifier).contact
                    .email ||
                  (parseIdentifier(nextView.identifier).method === "email"
                    ? parseIdentifier(nextView.identifier).value
                    : null),
                businessName: nextView.businessName || null,
              }
            : null,
        });
      },
      patchUserView: (input) => {
        const current = get().userView;
        if (!current) {
          return;
        }

        set({
          userView: {
            ...current,
            ...input,
          },
        });
      },
      syncFromStorage: (identifier) => {
        const normalizedIdentifier = toIdentifier(identifier);
        if (!normalizedIdentifier) {
          set({ ...initialState });
          return;
        }

        const profile = storageService.getProfile(normalizedIdentifier);
        const idInfo = parseIdentifier(normalizedIdentifier);
        const isGoogle = idInfo.method === "google";
        const googleData = isGoogle
          ? storageService.get<GoogleUser>(normalizedIdentifier, "googleData")
          : null;
        const nextView = createUserView(normalizedIdentifier);

        set({
          currentUserEmail: normalizedIdentifier,
          userView: nextView,
          user: {
            name: profile.fullName || googleData?.name || null,
            phone: isGoogle ? null : profile.contact.phone || null,
            email:
              profile.contact.email ||
              googleData?.email ||
              (idInfo.method === "email" ? idInfo.value : normalizedIdentifier),
            businessName: profile.businessName || null,
          },
          isGoogleUser: isGoogle,
          googleProfile: googleData,
          signInMethod: isGoogle ? "google" : "email",
        });
      },
      deleteCurrentAccount: () => {
        const activeIdentifier = get().currentUserEmail;
        if (!activeIdentifier) {
          return { ok: false, message: "الحساب غير موجود" };
        }

        if (isSupabaseConfigured && supabase) {
          void supabase
            .from("users")
            .delete()
            .eq("identifier", activeIdentifier);
          void supabase
            .from("submissions")
            .delete()
            .eq("identifier", activeIdentifier);
          void supabase
            .from("profile_settings")
            .delete()
            .eq("identifier", activeIdentifier);
        }

        const deleted = deleteAuthUser(activeIdentifier);
        if (!deleted && !isSupabaseConfigured) {
          return { ok: false, message: "ماقدرناش نحذف الحساب" };
        }

        storageService.deleteIdentifierData(activeIdentifier);
        get().signOut();
        return { ok: true };
      },
    }),
    {
      name: "client-auth-session",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          state.signOut();
          return;
        }

        state.authToken = token;
        storageService.setActiveSession(state.currentUserEmail ?? "");
        state.userView = createUserView(state.currentUserEmail);
        state.user = state.userView
          ? {
              name: state.userView.fullName || null,
              phone:
                storageService.getProfile(state.userView.identifier).contact
                  .phone || null,
              email: state.currentUserEmail,
              businessName: state.userView.businessName || null,
            }
          : null;
        state.signInMethod =
          state.userView?.authProvider === "google" ? "google" : "email";
        state.isGoogleUser = state.userView?.authProvider === "google";
        state.googleProfile = state.isGoogleUser
          ? storageService.load<GoogleUser | null>(
              state.currentUserEmail ?? "",
              "googleData",
              null,
            )
          : null;
      },
    },
  ),
);
