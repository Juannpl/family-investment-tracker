import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function POST(req: Request) {
  const access = await requireAdmin(req);
  if (access.error) return access.error;

  const body = await req.json().catch(() => null);
  const email = body?.email;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Email valide requis" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });

  if (error) {
    return Response.json({ error: "Invitation impossible" }, { status: 400 });
  }
  return Response.json({ success: true });
}
