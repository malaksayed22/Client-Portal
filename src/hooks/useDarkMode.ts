import { useEffect, useMemo, useState } from "react";
import { storageService } from "../lib/storageService";

const THEME_KEY = "theme_preference";

type ThemePreference = "light" | "dark";

const getInitialTheme = (): ThemePreference => {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" ? "dark" : "light";
};

const applyThemeClass = (theme: ThemePreference) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
};

export const useDarkMode = () => {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const initial = getInitialTheme();
    applyThemeClass(initial);
    return initial;
  });

  useEffect(() => {
    applyThemeClass(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    storageService.applyFontScale(storageService.getFontScale());
  }, []);

  const isDark = useMemo(() => theme === "dark", [theme]);

  const toggleDarkMode = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setDarkMode = (isDark: boolean) => {
    setTheme(isDark ? "dark" : "light");
  };

  return {
    isDark,
    toggleDarkMode,
    setDarkMode,
  };
};
