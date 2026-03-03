"use client";

import { useState, useEffect } from "react";

export type CookieConsent = {
  necessary: boolean;
  preferences: boolean;
};

const CONSENT_KEY = "cookie-consent";

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      setConsent(JSON.parse(stored));
    }
    setIsLoaded(true);
  }, []);

  const saveConsent = (newConsent: CookieConsent) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
  };

  const acceptAll = () => {
    saveConsent({ necessary: true, preferences: true });
  };

  const acceptNecessaryOnly = () => {
    saveConsent({ necessary: true, preferences: false });
  };

  const hasConsented = consent !== null;
  const canStorePreferences = consent?.preferences ?? false;

  return {
    consent,
    isLoaded,
    hasConsented,
    canStorePreferences,
    acceptAll,
    acceptNecessaryOnly,
  };
}
