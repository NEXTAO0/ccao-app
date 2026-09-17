import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// This module must stay free of `next/headers` imports so it can be bundled
// into the Next.js 16 Proxy (formerly middleware) boundary.

// [MANUAL_SETUP_REQUIRED]: Populate NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// from Supabase Dashboard → Project Settings → API.
const supabaseUrl: string =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";

const supabaseAnonKey: string =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

// [MANUAL_SETUP_REQUIRED]: Same value as NEXT_PUBLIC_AUTH_COOKIE_NAME in .env.example.
const cookieName = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ?? "sb-ccao-auth-token";

/** Server client bound to a request/response pair. Safe to use inside Proxy. */
export function createSupabaseServerClientForRequest(
  request: NextRequest,
  response: NextResponse
): SupabaseClient {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: cookieName,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set({
            name,
            value,
            path: "/",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            ...(options ?? {}),
          });
        }
      },
    },
  });
}