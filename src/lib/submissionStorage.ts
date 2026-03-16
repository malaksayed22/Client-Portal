import { SubmissionStatus, type Submission } from "../types/submission.types";

const LAST_SUBMISSION_PHONE_KEY = "lastSubmissionPhone";

const normalizeArabicDigits = (value: string) => {
  const arabicNumbers = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[٠-٩]/g, (digit) =>
    String(arabicNumbers.indexOf(digit)),
  );
};

export const normalizePhone = (value: string) =>
  normalizeArabicDigits(value).replace(/\s|-/g, "").trim();

const getSubmissionKey = (phone: string) =>
  `submission_${normalizePhone(phone)}`;

const createId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const stageToStatus = (stage: number): SubmissionStatus => {
  if (stage <= 0) {
    return SubmissionStatus.RECEIVED;
  }

  if (stage === 1) {
    return SubmissionStatus.REVIEWING;
  }

  if (stage === 2) {
    return SubmissionStatus.DESIGNING;
  }

  if (stage === 3) {
    return SubmissionStatus.BUILDING;
  }

  return SubmissionStatus.DELIVERED;
};

export const saveSubmission = (data: Submission): Submission => {
  const normalizedPhone = normalizePhone(data.phone);
  const previousSubmission = getSubmission(normalizedPhone);
  let nextId = createId();

  while (previousSubmission?.id && nextId === previousSubmission.id) {
    nextId = createId();
  }

  const submission: Submission = {
    ...data,
    id: nextId,
    phone: normalizedPhone,
    submittedAt: new Date().toISOString(),
    currentStage: 0,
    status: SubmissionStatus.RECEIVED,
  };

  localStorage.setItem(
    getSubmissionKey(normalizedPhone),
    JSON.stringify(submission),
  );
  localStorage.setItem(LAST_SUBMISSION_PHONE_KEY, normalizedPhone);

  return submission;
};

export const getSubmission = (phone: string): Submission | null => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  const raw = localStorage.getItem(getSubmissionKey(normalizedPhone));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Submission;
  } catch {
    return null;
  }
};

export const updateSubmissionStatus = (phone: string, stage: number): void => {
  const submission = getSubmission(phone);
  if (!submission) {
    return;
  }

  const safeStage = Math.max(0, Math.min(stage, 4));
  const next: Submission = {
    ...submission,
    currentStage: safeStage,
    status: stageToStatus(safeStage),
  };

  localStorage.setItem(getSubmissionKey(next.phone), JSON.stringify(next));
};

export const getLastSubmissionPhone = (): string | null => {
  const phone = localStorage.getItem(LAST_SUBMISSION_PHONE_KEY);
  return phone ? normalizePhone(phone) : null;
};

export const replaceSubmissionPhone = (
  oldPhone: string,
  newPhone: string,
): Submission | null => {
  const existing = getSubmission(oldPhone);
  if (!existing) {
    return null;
  }

  const normalizedOld = normalizePhone(oldPhone);
  const normalizedNew = normalizePhone(newPhone);
  if (!normalizedNew) {
    return null;
  }

  const updated: Submission = {
    ...existing,
    phone: normalizedNew,
  };

  if (normalizedOld !== normalizedNew) {
    localStorage.removeItem(getSubmissionKey(normalizedOld));
  }

  localStorage.setItem(
    getSubmissionKey(normalizedNew),
    JSON.stringify(updated),
  );
  localStorage.setItem(LAST_SUBMISSION_PHONE_KEY, normalizedNew);

  const oldSettingsKey = `profile_settings_${normalizedOld}`;
  const newSettingsKey = `profile_settings_${normalizedNew}`;
  const oldRatingKey = `user_rating_${normalizedOld}`;
  const newRatingKey = `user_rating_${normalizedNew}`;

  const settings = localStorage.getItem(oldSettingsKey);
  if (settings) {
    localStorage.setItem(newSettingsKey, settings);
    if (normalizedOld !== normalizedNew) {
      localStorage.removeItem(oldSettingsKey);
    }
  }

  const rating = localStorage.getItem(oldRatingKey);
  if (rating) {
    localStorage.setItem(newRatingKey, rating);
    if (normalizedOld !== normalizedNew) {
      localStorage.removeItem(oldRatingKey);
    }
  }

  return updated;
};

export const clearClientLocalData = (phone: string) => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return;
  }

  localStorage.removeItem(getSubmissionKey(normalized));
  localStorage.removeItem(`profile_settings_${normalized}`);
  localStorage.removeItem(`user_rating_${normalized}`);

  const lastPhone = getLastSubmissionPhone();
  if (lastPhone === normalized) {
    localStorage.removeItem(LAST_SUBMISSION_PHONE_KEY);
  }
};
