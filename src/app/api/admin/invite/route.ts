import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, requestId } = await req.json();

    console.log("Inviting:", email);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error("Supabase error:", error);
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.log("Link generated:", data.properties.action_link);

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
      console.error("Resend error:", emailError);
      return Response.json({ error: emailError.message }, { status: 500 });
    }

    await supabaseAdmin
      .from("access_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    return Response.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
