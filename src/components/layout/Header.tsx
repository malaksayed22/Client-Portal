import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useDarkMode } from "../../hooks/useDarkMode";
import { useAuthStore } from "../../store/authStore";

type HeaderProps = {
  showProfileShortcut?: boolean;
};

export const Header = ({ showProfileShortcut = true }: HeaderProps) => {
  const [hidden, setHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { isDark, toggleDarkMode } = useDarkMode();
  const currentUserEmail = useAuthStore((state) => state.currentUserEmail);
  const authToken = useAuthStore((state) => state.authToken);
  const isGoogleUser = useAuthStore((state) => state.isGoogleUser);
  const googleProfile = useAuthStore((state) => state.googleProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const verifyPassword = useAuthStore((state) => state.verifyPassword);
  const navigate = useNavigate();
  const isAuthenticated = Boolean(currentUserEmail && authToken);
  const shouldShowProfile = showProfileShortcut && isAuthenticated;

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const isScrollingDown = currentY > lastScrollY;
      const shouldHide = isScrollingDown && currentY > 90;

      setHidden(shouldHide);
      lastScrollY = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isMenuOpen]);

  return (
    <>
      <motion.header
        dir="rtl"
        initial="hidden"
        animate={{
          opacity: 1,
          y: hidden ? -110 : 0,
        }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="sticky inset-x-0 top-0 z-40 m-0 w-screen border-b border-white/15 bg-[#04122b]/50 p-0 backdrop-blur"
        style={{ left: 0, right: 0, width: "100vw", margin: 0, padding: 0 }}
      >
        <div className="flex items-center justify-between w-full px-4 h-14 sm:h-16 sm:px-5">
          <div className="flex items-center min-w-0 gap-2">
            <img
              src={logo}
              alt="T.Phoenix logo"
              className="object-contain w-20 h-20 rounded-full sm:h-14 sm:w-14"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 sm:gap-2">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex items-center justify-center text-white rounded-full h-9 w-9 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:h-10 sm:w-10"
              aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
              title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
            >
              {isDark ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M21 12.8A8.8 8.8 0 1111.2 3a7.2 7.2 0 009.8 9.8z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            {shouldShowProfile ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="inline-flex items-center justify-center text-white rounded-full h-9 w-9 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:h-10 sm:w-10"
                  aria-label="الملف الشخصي"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="menu"
                >
                  {isGoogleUser && googleProfile?.picture ? (
                    <img
                      src={googleProfile.picture}
                      width={28}
                      height={28}
                      className="object-cover rounded-full"
                      referrerPolicy="no-referrer"
                      alt="Google avatar"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-7 w-7"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="8"
                        r="3.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M5 20a7 7 0 0114 0"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>

                {isMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute end-0 top-14 min-w-[150px] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/settings");
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold rounded-lg text-textPrimary hover:bg-background"
                    >
                      <span>الإعدادات</span>
                      <span aria-hidden="true">⚙</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowLogoutConfirm(true);
                        setLogoutPassword("");
                        setLogoutError("");
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold rounded-lg text-error hover:bg-error/10"
                    >
                      <span>تسجيل الخروج</span>
                      <span aria-hidden="true">↩</span>
                    </button>

                    {showLogoutConfirm ? (
                      <div className="p-2 mt-1 border rounded-lg border-border bg-background">
                        <label className="block text-xs font-semibold text-textPrimary">
                          اكتب كلمة المرور
                        </label>
                        <input
                          type="password"
                          value={logoutPassword}
                          onChange={(event) => {
                            setLogoutPassword(event.target.value);
                            setLogoutError("");
                          }}
                          className="w-full px-2 mt-1 text-sm border rounded-lg h-9 border-border bg-card"
                          autoComplete="current-password"
                        />
                        {logoutError ? (
                          <p className="mt-1 text-xs text-error">
                            {logoutError}
                          </p>
                        ) : null}
                        <div className="flex gap-1 mt-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!logoutPassword.trim()) {
                                setLogoutError("اكتب كلمة المرور الأول");
                                return;
                              }

                              const isValid =
                                await verifyPassword(logoutPassword);
                              if (!isValid) {
                                setLogoutError("كلمة المرور غير صحيحة");
                                return;
                              }

                              setIsMenuOpen(false);
                              setShowLogoutConfirm(false);
                              signOut();
                              navigate("/signin", { replace: true });
                            }}
                            className="flex-1 rounded-md bg-error px-2 py-1.5 text-xs font-semibold text-white"
                          >
                            تأكيد
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowLogoutConfirm(false)}
                            className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs font-semibold"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </motion.header>
    </>
  );
};
