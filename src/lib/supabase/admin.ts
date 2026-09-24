import "server-only";

import { createClient } from "@supabase/supabase-js";

// Never attach request cookies or a user's session to this privileged client.
// Call only after requireAdmin has authorized the caller.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
