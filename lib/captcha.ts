import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CAPTCHA_PROOF_COOKIE = "ccao-captcha-proof";
export const CAPTCHA_PROOF_MAX_AGE_SECONDS = 300;

function sign(timestamp: string, nonce: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("CAPTCHA proof signing is not configured.");
  return createHmac("sha256", secret).update(`captcha:${timestamp}:${nonce}`).digest("base64url");
}

export function createCaptchaProof() {
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString("base64url");
  return `${timestamp}.${nonce}.${sign(timestamp, nonce)}`;
}

export function verifyCaptchaProof(proof: string | undefined, maxAgeSeconds = CAPTCHA_PROOF_MAX_AGE_SECONDS) {
  if (!proof) return false;
  const [timestampText, nonce, signature, ...extra] = proof.split(".");
  const timestamp = Number(timestampText);
  const age = Date.now() - timestamp;
  if (
    extra.length > 0 ||
    !nonce ||
    !signature ||
    !Number.isSafeInteger(timestamp) ||
    age < 0 ||
    age > maxAgeSeconds * 1000
  ) return false;

  const expected = Buffer.from(sign(timestampText, nonce));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyTurnstileToken(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}