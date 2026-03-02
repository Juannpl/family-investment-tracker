"use client";

import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    supabase.auth.getSession().then(console.log);
  }, []);

  return <h1>Supabase connecté</h1>;
}
