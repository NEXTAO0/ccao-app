import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export { createSupabaseServerClientForRequest } from "./supabaseProxy";

// [MANUAL_SETUP_REQUIRED]: Populate NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// from Supabase Dashboard → Project Settings → API.
const supabaseUrl: string =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";

const supabaseAnonKey: string =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

// [MANUAL_SETUP_REQUIRED]: Same value as NEXT_PUBLIC_AUTH_COOKIE_NAME in .env.example.
const cookieName = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ?? "sb-ccao-auth-token";

function cookieOptions() {
  return {
    name: cookieName,
    value: "",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax" as const,
  };
}

/** Server client bound to the incoming request's cookies (RLS applies to the signed-in user). */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: cookieName,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value } of cookiesToSet) {
            cookieStore.set({ ...cookieOptions(), name, value });
          }
        } catch {
          // Called from a Server Component. Ignore because the proxy refreshes sessions.
        }
      },
    },
  });
}