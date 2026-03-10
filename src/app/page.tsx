// app/page.tsx
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}
