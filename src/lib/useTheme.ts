"use client";

import { useState, useEffect } from "react";
import { useCookieConsent } from "./useCookieConsent";

export function useTheme() {
  const { canStorePreferences, isLoaded } = useCookieConsent();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (canStorePreferences) {
      const saved = localStorage.getItem("theme");
      setDarkMode(saved ? saved === "dark" : prefersDark);
    } else {
      setDarkMode(prefersDark);
    }
  }, [isLoaded, canStorePreferences]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);

    if (canStorePreferences) {
      localStorage.setItem("theme", darkMode ? "dark" : "light");
    }
  }, [darkMode, canStorePreferences]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return { darkMode, toggleDarkMode };
}
