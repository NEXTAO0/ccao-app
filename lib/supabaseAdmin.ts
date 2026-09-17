import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// [MANUAL_SETUP_REQUIRED]: Populate NEXT_PUBLIC_SUPABASE_URL (Supabase → Settings → API).
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// [MANUAL_SETUP_REQUIRED]: SUPABASE_SERVICE_ROLE_KEY bypasses RLS. SERVER ONLY.
// Never import this module from client components.
const serviceRoleKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isSupabaseConfigured: boolean =
  Boolean(supabaseUrl) && Boolean(serviceRoleKey);

let adminClient: SupabaseClient | null = null;

/** Admin client with service_role privileges. Use exclusively in API routes / server code. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}