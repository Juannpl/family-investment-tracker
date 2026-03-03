"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";

export default function Home() {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading) {
      router.replace(session ? "/dashboard" : "/login");
    }
  }, [session, loading, router]);

  return <p>Chargement…</p>;
}
