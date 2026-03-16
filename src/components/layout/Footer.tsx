import { motion } from "framer-motion";
import { fadeInUp } from "../../lib/animations";
import { getWhatsAppMeta } from "../../lib/whatsapp";
import { Tooltip } from "../ui/Tooltip";

export const Footer = () => {
  const { hasValidWaNumber, waHref } = getWhatsAppMeta();

  return (
    <footer dir="rtl" className="relative border-t border-border bg-card py-8">
      <p className="text-center text-sm text-textSecondary">
        جميع الحقوق محفوظة © 2026
      </p>

      <Tooltip content="تكلم معانا على واتساب">
        <motion.a
          href={waHref}
          target={hasValidWaNumber ? "_blank" : undefined}
          rel={hasValidWaNumber ? "noreferrer" : undefined}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -2, scale: 1.05 }}
          transition={{ delay: 2, duration: 0.9, ease: "easeOut" }}
          className="fixed z-30 inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/30 disabled:pointer-events-none disabled:opacity-50 sm:h-14 sm:w-14"
          style={{
            bottom: "calc(20px + env(safe-area-inset-bottom))",
            left: "max(16px, env(safe-area-inset-left))",
          }}
          aria-label="واتساب"
          aria-disabled={!hasValidWaNumber}
          onClick={(event) => {
            if (!hasValidWaNumber) {
              event.preventDefault();
            }
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.52 3.48A11.82 11.82 0 0012.08 0C5.5 0 .17 5.33.17 11.91c0 2.1.55 4.16 1.6 5.97L0 24l6.28-1.64a11.86 11.86 0 005.8 1.48h.01c6.58 0 11.91-5.33 11.91-11.91a11.8 11.8 0 00-3.48-8.45zM12.09 21.8a9.9 9.9 0 01-5.04-1.37l-.36-.21-3.73.97.99-3.63-.24-.38a9.86 9.86 0 01-1.51-5.28c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 012.9 6.99c0 5.46-4.44 9.9-9.9 9.9zm5.43-7.43c-.3-.15-1.78-.88-2.06-.98-.27-.1-.47-.15-.67.15s-.77.98-.95 1.18c-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.51-1.79-1.69-2.09-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.08-.8.37s-1.05 1.03-1.05 2.52c0 1.48 1.08 2.92 1.23 3.12.15.2 2.13 3.25 5.15 4.56.72.31 1.28.5 1.72.64.72.23 1.37.2 1.88.12.57-.08 1.78-.73 2.04-1.43.25-.7.25-1.31.17-1.43-.08-.12-.27-.2-.57-.35z" />
          </svg>
        </motion.a>
      </Tooltip>
    </footer>
  );
};
