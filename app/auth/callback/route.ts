import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClientForRequest } from "@/lib/supabaseServer";

// [MANUAL_SETUP_REQUIRED]: In Supabase Dashboard → Authentication → URL Configuration,
// add your site URL (e.g. https://ccao.vercel.app) and the redirect URLs:
//   https://ccao.vercel.app/auth/callback
// This route exchanges the OAuth / magic-link code for a session cookie.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createSupabaseServerClientForRequest(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Unable to sign in`);
}