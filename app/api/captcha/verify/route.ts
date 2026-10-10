import { NextResponse } from "next/server";
import {
  CAPTCHA_PROOF_COOKIE,
  CAPTCHA_PROOF_MAX_AGE_SECONDS,
  createCaptchaProof,
  verifyTurnstileToken,
} from "@/lib/captcha";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originHeader = request.headers.get("origin");
  const requestHost = request.headers.get("host");
  let validOrigin = false;
  try {
    validOrigin = Boolean(originHeader && requestHost && new URL(originHeader).host === requestHost);
  } catch {
    validOrigin = false;
  }
  if (!validOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid challenge response." }, { status: 400 });
  }
  if (!body.token || body.token.length > 4096) {
    return NextResponse.json({ error: "Complete the CAPTCHA challenge." }, { status: 400 });
  }
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return NextResponse.json({ error: "CAPTCHA verification is not configured." }, { status: 503 });
  }
  if (!(await verifyTurnstileToken(body.token))) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 403 });
  }

  let proof: string;
  try {
    proof = createCaptchaProof();
  } catch {
    return NextResponse.json({ error: "CAPTCHA verification is unavailable." }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CAPTCHA_PROOF_COOKIE, proof, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: CAPTCHA_PROOF_MAX_AGE_SECONDS,
  });
  return response;
}