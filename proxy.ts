import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClientForRequest } from "@/lib/supabaseServer";
import { consumeRateLimit, getClientAddress } from "@/lib/rateLimit";

function rateLimitedResponse(retryAfterSeconds: number, limit: number) {
  return NextResponse.json(
    { error: "Too many requests. Please wait before trying again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "Cache-Control": "no-store",
      },
    }
  );
}

async function allowRequest(identity: string, scope: string, limit: number, windowSeconds: number) {
  return consumeRateLimit(identity, scope, limit, windowSeconds);
}

function endpointLimit(pathname: string, method: string) {
  if (pathname === "/api/legal-consent" || pathname === "/api/captcha/verify") {
    return { scope: "anonymous-auth", limit: 10, windowSeconds: 900 };
  }
  if (pathname === "/api/check-spend") {
    return { scope: "spend-check", limit: 2, windowSeconds: 3600 };
  }
  if (pathname === "/auth/callback") {
    return { scope: "auth-callback", limit: 20, windowSeconds: 900 };
  }
  if (pathname === "/api/accounts" && method === "POST") {
    return { scope: "account-create", limit: 10, windowSeconds: 3600 };
  }
  if (pathname === "/api/budgets" && method === "POST") {
    return { scope: "budget-create", limit: 20, windowSeconds: 3600 };
  }
  if (pathname === "/api/user/delete") {
    return { scope: "account-delete", limit: 3, windowSeconds: 3600 };
  }
  return { scope: "api-default", limit: 120, windowSeconds: 60 };
}

async function requestBodyExceedsLimit(request: NextRequest) {
  if (!request.body) return false;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 65536) return true;

  const reader = request.clone().body?.getReader();
  if (!reader) return false;
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return false;
    size += value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      return true;
    }
  }
}

/**
 * Next.js 16 "Proxy" (formerly Middleware). Refreshes Supabase auth sessions on
 * every request so cached routes stay up to date. Protected routes redirect to
 * /login when there is no session.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const isApiRequest = pathname.startsWith("/api/");
  const isAuthRequest = pathname.startsWith("/auth/");

  if (isApiRequest || isAuthRequest) {
    const address = getClientAddress(request.headers);
    let ipLimit;
    try {
      ipLimit = await allowRequest(address, "api-ip", 300, 60);
    } catch {
      return NextResponse.json({ error: "Security controls are unavailable." }, { status: 503 });
    }
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfterSeconds, ipLimit.limit);

    const publicApi = pathname === "/api/legal-consent" || pathname === "/api/captcha/verify";
    const cronEndpoint = pathname === "/api/check-spend";
    if (publicApi || cronEndpoint || isAuthRequest) {
      const authorization = request.headers.get("authorization") ?? "";
      const isValidCron = cronEndpoint && Boolean(process.env.CRON_SECRET) &&
        authorization === `Bearer ${process.env.CRON_SECRET}`;
      const identity = isValidCron ? `cron:${authorization}` : address;
      const limit = endpointLimit(pathname, request.method);
      let endpointRate;
      try {
        endpointRate = await allowRequest(identity, limit.scope, limit.limit, limit.windowSeconds);
      } catch {
        return NextResponse.json({ error: "Security controls are unavailable." }, { status: 503 });
      }
      if (!endpointRate.allowed) return rateLimitedResponse(endpointRate.retryAfterSeconds, endpointRate.limit);

      if (await requestBodyExceedsLimit(request)) {
        return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
      }
      if (publicApi || isAuthRequest) return response;
    }
  }

  const supabase = createSupabaseServerClientForRequest(request, response);

  // Refresh session if expired; requires the cookie to be JWT-auth-mode.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /api/check-spend is guarded by CRON_SECRET (Vercel Cron), not a user session.
  const isCronEndpoint = pathname === "/api/check-spend";

  if (isApiRequest && !isCronEndpoint) {
    const address = getClientAddress(request.headers);
    const limit = endpointLimit(pathname, request.method);
    let actorRate;
    try {
      actorRate = await allowRequest(user ? `user:${user.id}` : address, limit.scope, limit.limit, limit.windowSeconds);
    } catch {
      return NextResponse.json({ error: "Security controls are unavailable." }, { status: 503 });
    }
    if (!actorRate.allowed) return rateLimitedResponse(actorRate.retryAfterSeconds, actorRate.limit);

    if (await requestBodyExceedsLimit(request)) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
  }

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
  matcher: ["/dashboard/:path*", "/api/:path*", "/auth/:path*"],
};