"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// [MANUAL_SETUP_REQUIRED]: Populate NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// in `.env.local` from Supabase Dashboard → Project Settings → API.
const supabaseUrl: string =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";

// [MANUAL_SETUP_REQUIRED]: anon/public key from Supabase → Settings → API.
const supabaseAnonKey: string =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

// [MANUAL_SETUP_REQUIRED]: Unique cookie name for @supabase/ssr session storage.
const cookieName = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ?? "sb-ccao-auth-token";

function createClient(): SupabaseClient {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: cookieName,
    },
  });
}

// Singleton browser client (safe to use in client components only).
const globalForSupabase = globalThis as unknown as {
  supabaseBrowserClient?: SupabaseClient;
};

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!globalForSupabase.supabaseBrowserClient) {
    globalForSupabase.supabaseBrowserClient = createClient();
  }
  return globalForSupabase.supabaseBrowserClient;
}

export default getSupabaseBrowserClient;