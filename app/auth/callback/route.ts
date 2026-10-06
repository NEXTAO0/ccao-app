import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClientForRequest } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { LEGAL_POLICY_VERSION } from "@/lib/legal";
import { LEGAL_CONSENT_COOKIE, verifyLegalConsentToken } from "@/lib/legalConsent";

// [MANUAL_SETUP_REQUIRED]: In Supabase Dashboard → Authentication → URL Configuration,
// add your site URL (e.g. https://ccao.vercel.app) and the redirect URLs:
//   https://ccao.vercel.app/auth/callback
// This route exchanges the OAuth / magic-link code for a session cookie.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\")
    ? requestedNext
    : "/dashboard";
  const legalVersion = searchParams.get("legalVersion");
  const consentToken = request.cookies.get(LEGAL_CONSENT_COOKIE)?.value;

  if (code && legalVersion === LEGAL_POLICY_VERSION && verifyLegalConsentToken(consentToken)) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createSupabaseServerClientForRequest(request, response);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { error: consentError } = await getSupabaseAdmin()
        .from("legal_consents")
        .upsert(
          {
            user_id: data.user.id,
            terms_version: LEGAL_POLICY_VERSION,
            privacy_version: LEGAL_POLICY_VERSION,
          },
          { onConflict: "user_id,terms_version,privacy_version", ignoreDuplicates: true }
        );

      if (!consentError) {
        response.cookies.set(LEGAL_CONSENT_COOKIE, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/auth/callback",
          maxAge: 0,
        });
        return response;
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Unable to sign in`);
}