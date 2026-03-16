import {
  defaultProfileData,
  type ProfileData,
} from "../../types/profile.types";

export const buildInitialProfile = (
  profile: ProfileData | null | undefined,
  fallbackEmail: string,
): ProfileData => {
  const now = new Date().toISOString();
  const safe = profile ?? defaultProfileData;

  return {
    ...defaultProfileData,
    ...safe,
    createdAt: safe.createdAt || now,
    updatedAt: safe.updatedAt || now,
    contact: {
      ...defaultProfileData.contact,
      ...safe.contact,
      email: safe.contact?.email || fallbackEmail,
    },
    notifications: {
      ...defaultProfileData.notifications,
      ...safe.notifications,
    },
    privacy: {
      ...defaultProfileData.privacy,
      ...safe.privacy,
    },
  };
};
