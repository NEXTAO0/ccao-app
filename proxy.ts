import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClientForRequest } from "@/lib/supabaseServer";

/**
 * Next.js 16 "Proxy" (formerly Middleware). Refreshes Supabase auth sessions on
 * every request so cached routes stay up to date. Protected routes redirect to
 * /login when there is no session.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createSupabaseServerClientForRequest(request, response);

  // Refresh session if expired; requires the cookie to be JWT-auth-mode.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /api/check-spend is guarded by CRON_SECRET (Vercel Cron), not a user session.
  const isCronEndpoint = pathname === "/api/check-spend";

  // Protect the dashboard and its API surface (except the cron endpoint).
  const isProtected =
    (pathname.startsWith("/dashboard") || pathname.startsWith("/api/")) &&
    !isCronEndpoint;

  if (isProtected && !user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};