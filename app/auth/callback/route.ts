import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClientForRequest } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { LEGAL_POLICY_VERSION } from "@/lib/legal";
import { verifyLegalConsentToken } from "@/lib/legalConsent";
import { CAPTCHA_PROOF_COOKIE, verifyCaptchaProof } from "@/lib/captcha";

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
  const consentToken = searchParams.get("legalProof") ?? undefined;
  const authMethod = searchParams.get("authMethod");
  const captchaCookie = request.cookies.get(CAPTCHA_PROOF_COOKIE)?.value;

  const consentAccepted = legalVersion === LEGAL_POLICY_VERSION && verifyLegalConsentToken(consentToken);
  if (code && consentAccepted) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createSupabaseServerClientForRequest(request, response);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const provider = data.user.app_metadata.provider;
      const captchaAccepted = provider === "github"
        ? authMethod === "oauth" && verifyCaptchaProof(captchaCookie)
        : provider === "email" && authMethod === "email";
      if (!captchaAccepted) {
        return NextResponse.redirect(`${origin}/login?error=Unable to verify sign-in protection`);
      }

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
        response.cookies.set(CAPTCHA_PROOF_COOKIE, "", {
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