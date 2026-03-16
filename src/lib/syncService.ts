import { normalizePhone } from "./submissionStorage";
import { storageService } from "./storageService";
import { isSupabaseConfigured, supabase } from "./supabase";
import { defaultProfileData, type ProfileData } from "../types/profile.types";
import {
  defaultProfileSettings,
  type ProfileSettings,
} from "../types/settings.types";
import { SubmissionStatus, type Submission } from "../types/submission.types";

const SYNC_QUEUE_KEY = "cp_sync_queue";
const LAST_SUBMISSION_PHONE_KEY = "lastSubmissionPhone";

type QueueItemType = "user" | "submission" | "settings";

type QueueItem = {
  type: QueueItemType;
  identifier: string;
  data: unknown;
  queuedAt: string;
};

type UserRow = {
  identifier: string;
  auth_method: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  business_type: string | null;
  bio: string | null;
  location: string | null;
  city: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  google_id: string | null;
  google_picture: string | null;
  updated_at: string;
};

type SubmissionRow = {
  id: string;
  identifier: string;
  submitted_at: string;
  updated_at: string;
  status: string;
  current_stage: number;
  estimated_delivery: string | null;
  client_name: string;
  business_name: string;
  business_description: string;
  customer_type: string[];
  unique_value: string;
  why_now: string;
  success_definition: string;
  has_existing_website: boolean;
  existing_website_feedback: string | null;
  inspired_sites: string[];
  inspired_sites_feedback: string | null;
  disliked_site: string | null;
  disliked_site_feedback: string | null;
  pages: string[];
  features: string[];
  content_responsibility: string;
  has_brand_assets: boolean;
  budget: string;
  has_deadline: boolean;
  deadline: string | null;
  deadline_reason: string | null;
  approver: string;
  phone: string;
  style_preferences: string[];
};

type SettingsRow = {
  identifier: string;
  notifications: Record<string, unknown>;
  preferences: Record<string, unknown>;
  privacy: Record<string, unknown>;
  updated_at: string;
};

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

const toUserRow = (identifier: string, profile: ProfileData): UserRow => ({
  identifier,
  auth_method: profile.authProvider || "email",
  name: profile.fullName || null,
  email: profile.contact.email || null,
  phone: profile.contact.phone || null,
  business_name: profile.businessName || null,
  business_type: profile.businessType || null,
  bio: profile.bio || null,
  location: profile.location || null,
  city: profile.contact.city || null,
  whatsapp: profile.contact.whatsapp || null,
  avatar_url: profile.avatar || null,
  google_id: profile.googleId || null,
  google_picture: profile.googlePhotoUrl || null,
  updated_at: new Date().toISOString(),
});

const fromUserRow = (row: Partial<UserRow>, base: ProfileData): ProfileData => {
  return mergeProfile({
    ...base,
    fullName: row.name ?? base.fullName,
    businessName: row.business_name ?? base.businessName,
    businessType: row.business_type ?? base.businessType,
    bio: row.bio ?? base.bio,
    location: row.location ?? base.location,
    avatar: row.avatar_url ?? base.avatar,
    authProvider:
      row.auth_method === "google" || row.auth_method === "phone"
        ? row.auth_method
        : "email",
    googleId: row.google_id ?? base.googleId,
    googlePhotoUrl: row.google_picture ?? base.googlePhotoUrl,
    contact: {
      ...base.contact,
      phone: row.phone ?? base.contact.phone,
      whatsapp: row.whatsapp ?? base.contact.whatsapp,
      email: row.email ?? base.contact.email,
      city: row.city ?? base.contact.city,
    },
  });
};

const toSubmissionRow = (
  identifier: string,
  submission: Submission,
): SubmissionRow => ({
  id: submission.id,
  identifier,
  submitted_at: submission.submittedAt,
  updated_at: new Date().toISOString(),
  status: submission.status,
  current_stage: submission.currentStage,
  estimated_delivery: submission.estimatedDelivery,
  client_name: submission.clientName,
  business_name: submission.businessName,
  business_description: submission.businessDescription,
  customer_type: submission.customerType,
  unique_value: submission.uniqueValue,
  why_now: submission.whyNow,
  success_definition: submission.successDefinition,
  has_existing_website: submission.hasExistingWebsite,
  existing_website_feedback: submission.existingWebsiteFeedback,
  inspired_sites: submission.inspiredSites,
  inspired_sites_feedback: submission.inspiredSitesFeedback,
  disliked_site: submission.dislikedSite,
  disliked_site_feedback: submission.dislikedSiteFeedback,
  pages: submission.pages,
  features: submission.features,
  content_responsibility: submission.contentResponsibility,
  has_brand_assets: submission.hasBrandAssets,
  budget: submission.budget,
  has_deadline: submission.hasDeadline,
  deadline: submission.deadline,
  deadline_reason: submission.deadlineReason,
  approver: submission.approver,
  phone: normalizePhone(submission.phone),
  style_preferences: submission.stylePreferences,
});

const fromSubmissionRow = (row: Partial<SubmissionRow>): Submission | null => {
  if (!row.id) {
    return null;
  }

  return {
    id: row.id,
    submittedAt: row.submitted_at ?? new Date().toISOString(),
    status: (row.status as Submission["status"]) ?? SubmissionStatus.RECEIVED,
    currentStage: typeof row.current_stage === "number" ? row.current_stage : 0,
    estimatedDelivery: row.estimated_delivery ?? null,
    clientName: row.client_name ?? "",
    businessName: row.business_name ?? "",
    businessDescription: row.business_description ?? "",
    customerType: row.customer_type ?? [],
    uniqueValue: row.unique_value ?? "",
    whyNow: row.why_now ?? "",
    successDefinition: row.success_definition ?? "",
    hasExistingWebsite: Boolean(row.has_existing_website),
    existingWebsiteFeedback: row.existing_website_feedback ?? null,
    inspiredSites: row.inspired_sites ?? [],
    inspiredSitesFeedback: row.inspired_sites_feedback ?? null,
    dislikedSite: row.disliked_site ?? null,
    dislikedSiteFeedback: row.disliked_site_feedback ?? null,
    pages: row.pages ?? [],
    features: row.features ?? [],
    contentResponsibility: row.content_responsibility ?? "",
    hasBrandAssets: Boolean(row.has_brand_assets),
    brandAssetsFiles: [],
    budget: row.budget ?? "",
    hasDeadline: Boolean(row.has_deadline),
    deadline: row.deadline ?? null,
    deadlineReason: row.deadline_reason ?? null,
    approver: row.approver ?? "",
    phone: normalizePhone(row.phone ?? ""),
    additionalNotes: null,
    stylePreferences: row.style_preferences ?? [],
  };
};

const toSettingsRow = (
  identifier: string,
  settings: ProfileSettings,
): SettingsRow => ({
  identifier,
  notifications: {
    projectUpdates: settings.projectUpdates,
    whatsappReminders: settings.whatsappReminders,
    emailReports: settings.emailReports,
  },
  preferences: {
    whatsappNumber: settings.whatsappNumber,
  },
  privacy: {},
  updated_at: new Date().toISOString(),
});

const fromSettingsRow = (row: Partial<SettingsRow>): ProfileSettings => ({
  projectUpdates:
    typeof row.notifications?.projectUpdates === "boolean"
      ? row.notifications.projectUpdates
      : defaultProfileSettings.projectUpdates,
  whatsappReminders:
    typeof row.notifications?.whatsappReminders === "boolean"
      ? row.notifications.whatsappReminders
      : defaultProfileSettings.whatsappReminders,
  emailReports:
    typeof row.notifications?.emailReports === "boolean"
      ? row.notifications.emailReports
      : defaultProfileSettings.emailReports,
  whatsappNumber:
    typeof row.preferences?.whatsappNumber === "string"
      ? row.preferences.whatsappNumber
      : defaultProfileSettings.whatsappNumber,
});

const getLegacySettingsKey = (identifier: string) =>
  `profile_settings_${identifier.trim()}`;

const cacheSubmissionLocally = (identifier: string, submission: Submission) => {
  storageService.save(identifier, "submission", submission);

  const normalizedPhone = normalizePhone(submission.phone);
  if (!normalizedPhone) {
    return;
  }

  localStorage.setItem(
    `submission_${normalizedPhone}`,
    JSON.stringify({
      ...submission,
      phone: normalizedPhone,
    }),
  );
  localStorage.setItem(LAST_SUBMISSION_PHONE_KEY, normalizedPhone);
};

const readQueue = (): QueueItem[] => {
  return safeParse<QueueItem[]>(localStorage.getItem(SYNC_QUEUE_KEY), []);
};

const writeQueue = (queue: QueueItem[]) => {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

class SyncService {
  private queueForSync(type: QueueItemType, identifier: string, data: unknown) {
    const queue = readQueue();
    queue.push({
      type,
      identifier,
      data,
      queuedAt: new Date().toISOString(),
    });
    writeQueue(queue);
  }

  async saveUser(
    identifier: string,
    userData: Partial<ProfileData>,
    options?: { queueOnFailure?: boolean },
  ) {
    if (!identifier.trim()) {
      return;
    }

    storageService.saveProfile(identifier, userData);
    const mergedProfile = storageService.getProfile(identifier);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .upsert(toUserRow(identifier, mergedProfile), {
          onConflict: "identifier",
        });

      if (error) {
        throw error;
      }
    } catch {
      if (options?.queueOnFailure === false) {
        throw new Error("user-sync-failed");
      }
      this.queueForSync("user", identifier, userData);
    }
  }

  async getUser(identifier: string): Promise<ProfileData | null> {
    if (!identifier.trim()) {
      return null;
    }

    if (!isSupabaseConfigured || !supabase) {
      return storageService.getProfile(identifier);
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("identifier", identifier)
        .maybeSingle<UserRow>();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      const profile = fromUserRow(data, storageService.getProfile(identifier));
      storageService.saveProfile(identifier, profile);
      return profile;
    } catch {
      return storageService.getProfile(identifier);
    }
  }

  async saveSubmission(
    identifier: string,
    submission: Submission,
    options?: { queueOnFailure?: boolean },
  ) {
    if (!identifier.trim()) {
      return;
    }

    cacheSubmissionLocally(identifier, submission);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const row = toSubmissionRow(identifier, submission);
      const { data: existingRows } = await supabase
        .from("submissions")
        .select("id")
        .eq("identifier", identifier)
        .order("updated_at", { ascending: false })
        .limit(1);

      const existingId = existingRows?.[0]?.id;
      const nextRow = existingId ? { ...row, id: existingId } : row;

      const { error } = await supabase.from("submissions").upsert(nextRow);
      if (error) {
        throw error;
      }
    } catch {
      if (options?.queueOnFailure === false) {
        throw new Error("submission-sync-failed");
      }
      this.queueForSync("submission", identifier, submission);
    }
  }

  async getSubmission(identifier: string): Promise<Submission | null> {
    if (!identifier.trim()) {
      return null;
    }

    if (!isSupabaseConfigured || !supabase) {
      return storageService.get<Submission>(identifier, "submission");
    }

    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("identifier", identifier)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const submission = fromSubmissionRow(data[0]);
      if (!submission) {
        return null;
      }

      cacheSubmissionLocally(identifier, submission);
      return submission;
    } catch {
      return storageService.get<Submission>(identifier, "submission");
    }
  }

  async saveSettings(
    identifier: string,
    settings: ProfileSettings,
    options?: { queueOnFailure?: boolean },
  ) {
    if (!identifier.trim()) {
      return;
    }

    storageService.save(identifier, "settings", settings);
    localStorage.setItem(
      getLegacySettingsKey(identifier),
      JSON.stringify(settings),
    );

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from("profile_settings")
        .upsert(toSettingsRow(identifier, settings), {
          onConflict: "identifier",
        });

      if (error) {
        throw error;
      }
    } catch {
      if (options?.queueOnFailure === false) {
        throw new Error("settings-sync-failed");
      }
      this.queueForSync("settings", identifier, settings);
    }
  }

  async getSettings(identifier: string): Promise<ProfileSettings | null> {
    if (!identifier.trim()) {
      return null;
    }

    if (!isSupabaseConfigured || !supabase) {
      return (
        storageService.get<ProfileSettings>(identifier, "settings") ??
        safeParse<ProfileSettings>(
          localStorage.getItem(getLegacySettingsKey(identifier)),
          defaultProfileSettings,
        )
      );
    }

    try {
      const { data, error } = await supabase
        .from("profile_settings")
        .select("*")
        .eq("identifier", identifier)
        .maybeSingle<SettingsRow>();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      const settings = fromSettingsRow(data);
      storageService.save(identifier, "settings", settings);
      localStorage.setItem(
        getLegacySettingsKey(identifier),
        JSON.stringify(settings),
      );
      return settings;
    } catch {
      return (
        storageService.get<ProfileSettings>(identifier, "settings") ??
        safeParse<ProfileSettings>(
          localStorage.getItem(getLegacySettingsKey(identifier)),
          defaultProfileSettings,
        )
      );
    }
  }

  async processSyncQueue() {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const queue = readQueue();
    if (queue.length === 0) {
      return;
    }

    const failed: QueueItem[] = [];

    for (const item of queue) {
      try {
        if (item.type === "user") {
          await this.saveUser(
            item.identifier,
            item.data as Partial<ProfileData>,
            {
              queueOnFailure: false,
            },
          );
        } else if (item.type === "submission") {
          await this.saveSubmission(item.identifier, item.data as Submission, {
            queueOnFailure: false,
          });
        } else {
          await this.saveSettings(
            item.identifier,
            item.data as ProfileSettings,
            {
              queueOnFailure: false,
            },
          );
        }
      } catch {
        failed.push(item);
      }
    }

    writeQueue(failed);
  }

  async syncOnSignIn(identifier: string) {
    const [user, submission, settings] = await Promise.all([
      this.getUser(identifier),
      this.getSubmission(identifier),
      this.getSettings(identifier),
    ]);

    if (user) {
      storageService.saveProfile(identifier, user);
    }

    if (submission) {
      cacheSubmissionLocally(identifier, submission);
    }

    if (settings) {
      storageService.save(identifier, "settings", settings);
      localStorage.setItem(
        getLegacySettingsKey(identifier),
        JSON.stringify(settings),
      );
    }

    return {
      user,
      submission,
      settings,
    };
  }
}

export const syncService = new SyncService();
