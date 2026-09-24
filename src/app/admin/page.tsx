import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const access = await requireAdmin();
  if (access.error) {
    if (access.error.status === 401) redirect("/login");
    return <p role="alert">Accès administrateur indisponible ou non autorisé.</p>;
  }
  return <AdminPanel />;
}
