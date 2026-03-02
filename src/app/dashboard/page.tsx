"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/login";
      } else {
        setUser(data.user);
      }
    });
  }, []);

  if (!user) return null;

  return (
    <main style={{ padding: 40 }}>
      <h1>Dashboard familial</h1>
      <p>Connecté en tant que {user.email}</p>
    </main>
  );
}
