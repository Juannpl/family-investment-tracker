"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();

      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setError(error.message);
          return;
        }

        router.push("/auth/set-password");
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
        router.push("/auth/set-password");
        return;
      }

      setError("Lien invalide ou expiré");
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="max-w-sm mx-auto p-6">
        <h1 className="text-xl font-bold text-red-600 mb-2">Erreur</h1>
        <p>{error}</p>
      </div>
    );
  }

  return <p className="p-6">Authentification en cours…</p>;
}
