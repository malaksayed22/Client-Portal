export type ProfileAuthProvider = "phone" | "google" | "email";

export type ThemeFontScale = "small" | "medium" | "large";

export type NotificationPreferences = {
  projectUpdates: boolean;
  whatsappReminders: boolean;
  emailReports: boolean;
};

export type PrivacyPreferences = {
  showEmailOnProfile: boolean;
  allowProjectShowcase: boolean;
};

export type ContactInfo = {
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
};

export type ProfileData = {
  fullName: string;
  username: string;
  businessName: string;
  businessType: string;
  bio: string;
  location: string;
  avatar: string;
  authProvider: ProfileAuthProvider;
  googleId: string;
  googlePhotoUrl: string;
  createdAt: string;
  updatedAt: string;
  contact: ContactInfo;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  darkMode: boolean;
  fontScale: ThemeFontScale;
};

export const defaultProfileData: ProfileData = {
  fullName: "",
  username: "",
  businessName: "",
  businessType: "",
  bio: "",
  location: "",
  avatar: "",
  authProvider: "email",
  googleId: "",
  googlePhotoUrl: "",
  createdAt: "",
  updatedAt: "",
  contact: {
    phone: "",
    whatsapp: "",
    email: "",
    city: "",
  },
  notifications: {
    projectUpdates: true,
    whatsappReminders: false,
    emailReports: false,
  },
  privacy: {
    showEmailOnProfile: false,
    allowProjectShowcase: false,
  },
  darkMode: false,
  fontScale: "medium",
};
