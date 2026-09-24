import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { Resend } from "resend";

export async function POST(req: Request) {
  const access = await requireAdmin(req);
  if (access.error) return access.error;

  const body = await req.json().catch(() => null);
  const email = body?.email;
  const requestId = body?.requestId;
  if (
    typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof requestId !== "string" || !requestId.trim()
  ) {
    return Response.json({ error: "Email et requestId valides requis" }, { status: 400 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: pending, error: lookupError } = await supabaseAdmin
      .from("access_requests")
      .select("id")
      .eq("id", requestId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (lookupError) {
      return Response.json({ error: "Lecture de la demande impossible" }, { status: 500 });
    }
    if (!pending) {
      return Response.json({ error: "Demande en attente introuvable" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      return Response.json({ error: "Invitation impossible" }, { status: 400 });
    }

    const { error: emailError } = await resend.emails.send({
      from: "Mon App <no-reply@resend.dev>",
      to: email,
      subject: "Votre invitation",
      html: `
        <h1>Bienvenue !</h1>
        <p>Votre demande d'accès a été approuvée.</p>
        <a href="${data.properties.action_link}">Créer mon compte</a>
      `,
    });

    if (emailError) {
      return Response.json({ error: "Envoi de l’invitation impossible" }, { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("access_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    if (updateError) {
      return Response.json({ error: "Mise à jour de la demande impossible" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
