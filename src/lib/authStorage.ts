import { buildIdentifier, parseIdentifier } from "./buildIdentifier";

type AuthUserRecord = {
  email: string;
  password: string;
  createdAt: string;
  phone?: string;
  googleId?: string;
  googlePhotoUrl?: string;
  provider?: "phone" | "google" | "email";
};

type GoogleAuthInput = {
  googleId: string;
  name: string;
  email: string;
  picture: string;
  identifier?: string;
};

type AuthUsersMap = Record<string, AuthUserRecord>;

const AUTH_USERS_KEY = "client-portal-auth-users";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isIdentifier = (value: string) => {
  return /^(email|phone|google)_/.test(value.trim());
};

const toCanonicalIdentifier = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (isIdentifier(trimmed)) {
    const parsed = parseIdentifier(trimmed);
    if (parsed.method === "email") {
      return buildIdentifier("email", parsed.value);
    }
    if (parsed.method === "phone") {
      return buildIdentifier("phone", parsed.value);
    }
    if (parsed.method === "google") {
      return buildIdentifier("google", parsed.value);
    }
  }

  return buildIdentifier("email", trimmed);
};

const readUsersMap = (): AuthUsersMap => {
  const raw = localStorage.getItem(AUTH_USERS_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as AuthUsersMap;
    const migrated: AuthUsersMap = {};

    Object.entries(parsed).forEach(([key, value]) => {
      const identifier = (() => {
        if (isIdentifier(key)) {
          return toCanonicalIdentifier(key);
        }

        if (value.provider === "google" && value.googleId) {
          return buildIdentifier("google", value.googleId);
        }

        return buildIdentifier("email", value.email || key);
      })();

      if (!identifier) {
        return;
      }

      migrated[identifier] = {
        ...value,
        email: normalizeEmail(value.email || key),
      };
    });

    if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
      writeUsersMap(migrated);
    }

    return migrated;
  } catch {
    return {};
  }
};

const writeUsersMap = (users: AuthUsersMap) => {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
};

export const getAuthUserByEmail = (email: string): AuthUserRecord | null => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const users = readUsersMap();
  const identifier = buildIdentifier("email", normalizedEmail);
  const direct = users[identifier];
  if (direct) {
    return direct;
  }

  const fallback = Object.values(users).find(
    (user) => normalizeEmail(user.email) === normalizedEmail,
  );
  return fallback ?? null;
};

export const getAuthUserByIdentifier = (
  identifier: string,
): AuthUserRecord | null => {
  const canonical = toCanonicalIdentifier(identifier);
  if (!canonical) {
    return null;
  }

  const users = readUsersMap();
  return users[canonical] ?? null;
};

export const getAuthUserByPhone = (phone: string): AuthUserRecord | null => {
  const normalizedPhone = phone.trim();
  if (!normalizedPhone) {
    return null;
  }

  const users = readUsersMap();
  const match = Object.values(users).find(
    (user) => user.phone?.trim() === normalizedPhone,
  );
  return match ?? null;
};

export const updateAuthUser = (
  identifier: string,
  updater: (previous: AuthUserRecord) => AuthUserRecord,
): boolean => {
  const canonical = toCanonicalIdentifier(identifier);
  if (!canonical) {
    return false;
  }

  const users = readUsersMap();
  const current = users[canonical];
  if (!current) {
    return false;
  }

  users[canonical] = updater(current);
  writeUsersMap(users);
  return true;
};

export const isEmailRegistered = (email: string): boolean => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return false;
  }

  const users = readUsersMap();
  const identifier = buildIdentifier("email", normalizedEmail);
  if (users[identifier]) {
    return true;
  }

  return Object.values(users).some(
    (user) => normalizeEmail(user.email) === normalizedEmail,
  );
};

export const registerAuthUser = (
  emailOrIdentifier: string,
  password: string,
): { ok: boolean; message?: string } => {
  const canonical = toCanonicalIdentifier(emailOrIdentifier);
  const parsed = parseIdentifier(canonical);
  const normalizedEmail =
    parsed.method === "email"
      ? normalizeEmail(parsed.value)
      : normalizeEmail(emailOrIdentifier);

  if (!canonical || !normalizedEmail || !password.trim()) {
    return { ok: false, message: "اكتب الإيميل وكلمة المرور" };
  }

  if (isEmailRegistered(normalizedEmail)) {
    return { ok: false, message: "الحساب موجود بالفعل" };
  }

  const users = readUsersMap();

  users[canonical] = {
    email: normalizedEmail,
    password,
    createdAt: new Date().toISOString(),
    provider: parsed.method === "google" ? "google" : "email",
  };

  writeUsersMap(users);
  return { ok: true };
};

export const validateAuthCredentials = (
  identifierOrEmail: string,
  password: string,
): boolean => {
  const canonical = toCanonicalIdentifier(identifierOrEmail);
  const users = readUsersMap();
  const user = users[canonical];
  if (!user) {
    const fallback = getAuthUserByEmail(identifierOrEmail);
    return fallback ? fallback.password === password : false;
  }

  return user.password === password;
};

export const updatePassword = (
  identifierOrEmail: string,
  currentPassword: string,
  nextPassword: string,
): { ok: boolean; message?: string } => {
  const canonical = toCanonicalIdentifier(identifierOrEmail);
  if (!canonical) {
    return { ok: false, message: "الحساب غير موجود" };
  }

  const users = readUsersMap();
  const user = users[canonical];
  if (!user) {
    return { ok: false, message: "الحساب غير موجود" };
  }

  if (user.password !== currentPassword) {
    return { ok: false, message: "كلمة السر الحالية غلط" };
  }

  users[canonical] = {
    ...user,
    password: nextPassword,
  };
  writeUsersMap(users);
  return { ok: true };
};

export const deleteAuthUser = (email: string): boolean => {
  const canonical = toCanonicalIdentifier(email);
  if (!canonical) {
    return false;
  }

  const users = readUsersMap();
  if (!users[canonical]) {
    return false;
  }

  delete users[canonical];
  writeUsersMap(users);
  return true;
};

export const registerOrUpdateGoogleAuthUser = (
  input: GoogleAuthInput,
): { ok: boolean; email?: string; identifier?: string; message?: string } => {
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail || !input.googleId.trim()) {
    return { ok: false, message: "بيانات جوجل ناقصة" };
  }

  const users = readUsersMap();
  const preferredIdentifier = input.identifier
    ? toCanonicalIdentifier(input.identifier)
    : buildIdentifier("google", input.googleId);
  const existingEmailIdentifier = buildIdentifier("email", normalizedEmail);
  const existing = users[preferredIdentifier] ?? users[existingEmailIdentifier];

  users[preferredIdentifier] = {
    email: normalizedEmail,
    password: existing?.password ?? "",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    phone: existing?.phone,
    googleId: input.googleId,
    googlePhotoUrl: input.picture,
    provider: "google",
  };

  if (existingEmailIdentifier !== preferredIdentifier) {
    delete users[existingEmailIdentifier];
  }

  writeUsersMap(users);
  return { ok: true, email: normalizedEmail, identifier: preferredIdentifier };
};
