export type IdentifierMethod = "phone" | "google" | "email";

const normalizePhoneValue = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/^\+20/, "0")
    .replace(/^20/, "0");

  return cleaned;
};

export const buildIdentifier = (
  method: IdentifierMethod,
  value: string,
): string => {
  if (method === "phone") {
    return `phone_${normalizePhoneValue(value)}`;
  }

  if (method === "google") {
    return `google_${value.trim()}`;
  }

  return `email_${value.toLowerCase().trim()}`;
};

export const parseIdentifier = (
  identifier: string,
): { method: string; value: string } => {
  const [method, ...rest] = identifier.split("_");
  return {
    method,
    value: rest.join("_"),
  };
};
