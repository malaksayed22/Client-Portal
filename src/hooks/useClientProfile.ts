import { useCallback, useMemo, useState } from "react";
import {
  normalizePhone,
  replaceSubmissionPhone,
} from "../lib/submissionStorage";
import { storageService } from "../lib/storageService";
import { syncService } from "../lib/syncService";
import type { Submission } from "../types/submission.types";
import { defaultProfileData, type ProfileData } from "../types/profile.types";
import { useProfileSettings } from "./useProfileSettings";

const avatarPalette = [
  "#1B4FFF",
  "#FF6B35",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
];

const maskPhone = (phone: string) => {
  const normalized = normalizePhone(phone);
  if (normalized.length < 4) {
    return normalized;
  }

  return `${normalized.slice(0, 2)}*******${normalized.slice(-2)}`;
};

export const getInitials = (name: string) => {
  const cleaned = name.trim();
  if (!cleaned) {
    return "؟؟";
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "؟";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? parts[0]?.[0] ?? "؟";

  return `${first}${second}`.toUpperCase();
};

export const hashName = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const formatArabicDate = (isoDate: string) => {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
};

export const useClientProfile = () => {
  const activeIdentifier = storageService.getActiveIdentifier();
  const [profileVersion, setProfileVersion] = useState(0);
  const identifier = useMemo(() => activeIdentifier ?? "", [activeIdentifier]);
  const submission = useMemo(() => {
    void profileVersion;
    if (!identifier) {
      return null;
    }

    return storageService.get<Submission>(identifier, "submission");
  }, [identifier, profileVersion]);

  const profile = useMemo(() => {
    void profileVersion;

    if (!identifier) {
      return {
        ...defaultProfileData,
        fullName: submission?.clientName ?? "",
        businessName: submission?.businessName ?? "",
        businessType: submission?.customerType?.[0] ?? "",
        bio: submission?.businessDescription ?? "",
      };
    }

    const stored = storageService.getProfile(identifier);
    return {
      ...stored,
      fullName: stored.fullName || submission?.clientName || "",
      businessName: stored.businessName || submission?.businessName || "",
      businessType: stored.businessType || submission?.customerType?.[0] || "",
      bio: stored.bio || submission?.businessDescription || "",
      contact: {
        ...stored.contact,
        phone: stored.contact.phone || submission?.phone || "",
        email: stored.contact.email || "",
      },
    };
  }, [identifier, profileVersion, submission]);

  const settingsLookupKey = useMemo(() => identifier, [identifier]);

  const { settings, updateSetting, saveSettings } =
    useProfileSettings(settingsLookupKey);

  const maskedPhone = useMemo(
    () => (submission ? maskPhone(submission.phone) : ""),
    [submission],
  );
  const initials = useMemo(
    () => getInitials(profile.username || profile.fullName || identifier || ""),
    [identifier, profile.fullName, profile.username],
  );
  const avatarColor = useMemo(() => {
    const hash = hashName(
      profile.username || profile.fullName || identifier || "",
    );
    return avatarPalette[hash % avatarPalette.length];
  }, [identifier, profile.fullName, profile.username]);
  const formattedDate = useMemo(
    () => (submission ? formatArabicDate(submission.submittedAt) : ""),
    [submission],
  );

  const updatePhone = useCallback(
    async (phone: string) => {
      if (!submission) {
        return false;
      }

      const updated = replaceSubmissionPhone(submission.phone, phone);
      if (!updated) {
        return false;
      }

      if (identifier) {
        await syncService.saveSubmission(identifier, updated);
      }
      setProfileVersion((prev) => prev + 1);
      return true;
    },
    [identifier, submission],
  );

  const updateWhatsApp = useCallback(
    async (phone: string) => {
      await updateSetting("whatsappNumber", phone);
      return true;
    },
    [updateSetting],
  );

  const saveProfile = useCallback(
    async (nextProfile: Partial<ProfileData>) => {
      if (!identifier) {
        return false;
      }

      await syncService.saveUser(identifier, nextProfile);
      setProfileVersion((prev) => prev + 1);
      return true;
    },
    [identifier],
  );

  const removeAvatar = useCallback(() => {
    if (!identifier) {
      return false;
    }

    void syncService.saveUser(identifier, { avatar: "" });
    setProfileVersion((prev) => prev + 1);
    return true;
  }, [identifier]);

  return {
    identifier,
    submission,
    profile,
    settings,
    updateSetting,
    saveSettings,
    maskedPhone,
    initials,
    avatarColor,
    formattedDate,
    updatePhone,
    updateWhatsApp,
    saveProfile,
    removeAvatar,
  };
};
