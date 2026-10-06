import { NextResponse } from "next/server";
import {
  createLegalConsentToken,
  LEGAL_CONSENT_COOKIE,
  LEGAL_CONSENT_MAX_AGE_SECONDS,
} from "@/lib/legalConsent";
import { LEGAL_POLICY_VERSION } from "@/lib/legal";

export const runtime = "nodejs";

function hasSameOrigin(request: Request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return false;

  try {
    const origin = new URL(originHeader);
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
    const allowedHost = request.headers.get("host") || forwardedHost || requestUrl.host;
    const allowedProtocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
    return origin.host.toLowerCase() === allowedHost.toLowerCase() &&
      origin.protocol.slice(0, -1).toLowerCase() === allowedProtocol.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: { accepted?: boolean; version?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.accepted !== true || body.version !== LEGAL_POLICY_VERSION) {
    return NextResponse.json({ error: "Policy acceptance is required." }, { status: 400 });
  }

  let token: string;
  try {
    token = createLegalConsentToken();
  } catch {
    return NextResponse.json({ error: "Consent verification is not configured." }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LEGAL_CONSENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: LEGAL_CONSENT_MAX_AGE_SECONDS,
  });
  return response;
}