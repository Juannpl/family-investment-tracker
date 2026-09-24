import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(request?: Request) {
  // Cookie-authenticated mutations must not be initiated by another site.
  if (request && request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== new URL(request.url).origin)
    ) {
      return { error: Response.json({ error: "Origine interdite" }, { status: 403 }) };
    }
  }

  try {
    const supabase = await createClient();
    // getUser validates the session with Auth and returns current app metadata.
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { error: Response.json({ error: "Authentification requise" }, { status: 401 }) };
    }
    // user_metadata is editable by the user and must never grant privileges.
    if (user.app_metadata?.role !== "admin") {
      return { error: Response.json({ error: "Accès administrateur requis" }, { status: 403 }) };
    }
    return { user };
  } catch {
    return { error: Response.json({ error: "Vérification d’accès indisponible" }, { status: 503 }) };
  }
}
