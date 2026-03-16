import { defaultProfileData, type ProfileData } from "../types/profile.types";
import { getSubmission, normalizePhone } from "./submissionStorage";

const PROFILE_PREFIX = "profile_";
const META_PREFIX = "profile_meta_";
const SESSION_KEY = "cp_active_sessions";
const THEME_FONT_SCALE_KEY = "cp_theme_fontScale";
const ACTIVE_IDENTIFIER_KEY = "cp_active_identifier";

type SessionRecord = {
  identifier: string;
  token: string;
  createdAt: string;
  deviceLabel: string;
};

type ProfileMeta = {
  avatar?: string;
  profile?: ProfileData;
  [key: string]: unknown;
};

const normalizeIdentifier = (identifier: string) =>
  identifier.trim().toLowerCase();

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const getProfileKey = (identifier: string) =>
  `${PROFILE_PREFIX}${normalizeIdentifier(identifier)}`;

const getMetaKey = (identifier: string) =>
  `${META_PREFIX}${normalizeIdentifier(identifier)}`;

const mergeProfile = (incoming: Partial<ProfileData>): ProfileData => {
  const now = new Date().toISOString();
  return {
    ...defaultProfileData,
    ...incoming,
    contact: {
      ...defaultProfileData.contact,
      ...incoming.contact,
    },
    notifications: {
      ...defaultProfileData.notifications,
      ...incoming.notifications,
    },
    privacy: {
      ...defaultProfileData.privacy,
      ...incoming.privacy,
    },
    createdAt: incoming.createdAt || now,
    updatedAt: now,
  };
};

const readMeta = (identifier: string): ProfileMeta => {
  return safeParse<ProfileMeta>(
    localStorage.getItem(getMetaKey(identifier)),
    {},
  );
};

const writeMeta = (identifier: string, next: ProfileMeta) => {
  localStorage.setItem(getMetaKey(identifier), JSON.stringify(next));
};

const readSessions = (): SessionRecord[] => {
  return safeParse<SessionRecord[]>(localStorage.getItem(SESSION_KEY), []);
};

const writeSessions = (sessions: SessionRecord[]) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
};

const getDeviceLabel = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) {
    return "Windows";
  }
  if (ua.includes("Mac")) {
    return "Mac";
  }
  if (ua.includes("Android")) {
    return "Android";
  }
  if (ua.includes("iPhone") || ua.includes("iPad")) {
    return "iOS";
  }
  return "متصفح";
};

export const storageService = {
  save<T>(identifier: string, key: string, value: T) {
    if (!identifier.trim() || !key.trim()) {
      return;
    }

    const meta = readMeta(identifier);
    const next = {
      ...meta,
      [key]: value,
    };
    writeMeta(identifier, next);
  },

  setActiveSession(identifier: string) {
    if (!identifier.trim()) {
      return;
    }

    localStorage.setItem(
      ACTIVE_IDENTIFIER_KEY,
      normalizeIdentifier(identifier),
    );
  },

  clearActiveSession() {
    localStorage.removeItem(ACTIVE_IDENTIFIER_KEY);
  },

  getActiveSession() {
    return localStorage.getItem(ACTIVE_IDENTIFIER_KEY);
  },

  getActiveIdentifier() {
    return this.getActiveSession();
  },

  getAllIdentifiers() {
    const identifiers = new Set<string>();

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) {
        continue;
      }

      if (key.startsWith(PROFILE_PREFIX)) {
        identifiers.add(key.slice(PROFILE_PREFIX.length).trim());
        continue;
      }

      if (key.startsWith(META_PREFIX)) {
        identifiers.add(key.slice(META_PREFIX.length).trim());
      }
    }

    const active = this.getActiveIdentifier();
    if (active) {
      identifiers.add(active.trim());
    }

    this.getSessions().forEach((session) => {
      if (session.identifier.trim()) {
        identifiers.add(session.identifier.trim());
      }
    });

    return Array.from(identifiers).filter(Boolean);
  },

  hasSubmission(identifier: string) {
    if (!identifier.trim()) {
      return false;
    }

    const profile = this.getProfile(identifier);
    const phone = normalizePhone(profile.contact.phone || "");
    if (!phone) {
      return false;
    }

    return Boolean(getSubmission(phone));
  },

  load<T>(identifier: string, key: string, fallback: T): T {
    if (!identifier.trim() || !key.trim()) {
      return fallback;
    }

    const meta = readMeta(identifier);
    const value = meta[key] as T | undefined;
    return value === undefined ? fallback : value;
  },

  get<T>(identifier: string, key: string) {
    return this.load<T | null>(identifier, key, null);
  },

  getProfile(identifier: string): ProfileData {
    if (!identifier.trim()) {
      return mergeProfile({});
    }

    const raw = localStorage.getItem(getProfileKey(identifier));
    const parsed = safeParse<Partial<ProfileData>>(raw, {});
    return mergeProfile(parsed);
  },

  saveProfile(identifier: string, profile: Partial<ProfileData>) {
    if (!identifier.trim()) {
      return;
    }

    const existing = this.getProfile(identifier);
    const merged = mergeProfile({
      ...existing,
      ...profile,
      contact: {
        ...existing.contact,
        ...profile.contact,
      },
      notifications: {
        ...existing.notifications,
        ...profile.notifications,
      },
      privacy: {
        ...existing.privacy,
        ...profile.privacy,
      },
    });

    localStorage.setItem(getProfileKey(identifier), JSON.stringify(merged));
  },

  saveProfileSection<K extends keyof ProfileData>(
    identifier: string,
    key: K,
    value: ProfileData[K],
  ) {
    const existing = this.getProfile(identifier);
    this.saveProfile(identifier, {
      ...existing,
      [key]: value,
    });
  },

  registerSession(identifier: string, token: string) {
    if (!identifier.trim() || !token.trim()) {
      return;
    }

    const normalized = normalizeIdentifier(identifier);
    const now = new Date().toISOString();
    const sessions = readSessions().filter((entry) => entry.token !== token);
    sessions.push({
      identifier: normalized,
      token,
      createdAt: now,
      deviceLabel: getDeviceLabel(),
    });
    writeSessions(sessions);
  },

  getSessions(identifier?: string) {
    const sessions = readSessions();
    if (!identifier?.trim()) {
      return sessions;
    }

    const normalized = normalizeIdentifier(identifier);
    return sessions.filter((entry) => entry.identifier === normalized);
  },

  clearAllSessions(identifier?: string) {
    if (!identifier?.trim()) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    const normalized = normalizeIdentifier(identifier);
    const filtered = readSessions().filter(
      (entry) => entry.identifier !== normalized,
    );
    writeSessions(filtered);
  },

  removeSessionByToken(token: string) {
    if (!token.trim()) {
      return;
    }

    const filtered = readSessions().filter((entry) => entry.token !== token);
    writeSessions(filtered);
  },

  deleteIdentifierData(identifier: string) {
    if (!identifier.trim()) {
      return;
    }

    const normalized = normalizeIdentifier(identifier);
    localStorage.removeItem(getProfileKey(normalized));
    localStorage.removeItem(getMetaKey(normalized));
    this.clearAllSessions(normalized);
  },

  setFontScale(fontScale: ProfileData["fontScale"]) {
    localStorage.setItem(THEME_FONT_SCALE_KEY, fontScale);
  },

  getFontScale(): ProfileData["fontScale"] {
    const value = localStorage.getItem(THEME_FONT_SCALE_KEY);
    if (value === "small" || value === "medium" || value === "large") {
      return value;
    }
    return "medium";
  },

  applyFontScale(fontScale: ProfileData["fontScale"]) {
    const map: Record<ProfileData["fontScale"], string> = {
      small: "0.9",
      medium: "1",
      large: "1.1",
    };
    document.documentElement.style.setProperty("--font-scale", map[fontScale]);
    this.setFontScale(fontScale);
  },
};
