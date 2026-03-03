"use client";

import { useCookieConsent } from "@/lib/useCookieConsent";

export default function CookieBanner() {
  const { isLoaded, hasConsented, acceptAll, acceptNecessaryOnly } =
    useCookieConsent();

  if (!isLoaded || hasConsented) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">
          Nous utilisons des cookies pour améliorer votre expérience, notamment
          pour mémoriser vos préférences (thème sombre/clair).
        </p>
        <div className="flex gap-2">
          <button
            onClick={acceptNecessaryOnly}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
