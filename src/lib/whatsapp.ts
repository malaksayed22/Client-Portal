const DEFAULT_WHATSAPP_NUMBER = "201070600687";

const normalizeWhatsappNumber = (value: string) => value.replace(/\D/g, "");

export const getWhatsAppMeta = () => {
  const envValue = import.meta.env.VITE_WHATSAPP_NUMBER ?? "";
  const normalizedEnv = normalizeWhatsappNumber(envValue);

  const waNumber =
    normalizedEnv.length >= 10 && normalizedEnv.length <= 15
      ? normalizedEnv
      : DEFAULT_WHATSAPP_NUMBER;

  const hasValidWaNumber = waNumber.length >= 10 && waNumber.length <= 15;
  const waHref = hasValidWaNumber ? `https://wa.me/${waNumber}` : "#";

  return {
    waNumber,
    hasValidWaNumber,
    waHref,
  };
};
