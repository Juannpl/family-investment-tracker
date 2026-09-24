// app/api/admin/users/route.ts
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const access = await requireAdmin(req);
  if (access.error) return access.error;
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: "Opération utilisateurs impossible" }, { status: 500 });
  }

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }));

  return NextResponse.json({ users }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(req: NextRequest) {
  const access = await requireAdmin(req);
  if (access.error) return access.error;

  const body = await req.json().catch(() => null);
  const userId = body?.userId;

  if (typeof userId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: "Opération utilisateurs impossible" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
