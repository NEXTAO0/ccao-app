import { createHmac, timingSafeEqual } from "node:crypto";
import { LEGAL_POLICY_VERSION } from "@/lib/legal";

export const LEGAL_CONSENT_MAX_AGE_SECONDS = 60 * 60;

function getConsentSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Supabase service role key is not configured.");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getConsentSecret()).update(payload).digest("base64url");
}

export function createLegalConsentToken(timestamp = Date.now()) {
  const payload = `${LEGAL_POLICY_VERSION}.${timestamp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyLegalConsentToken(token: string | undefined) {
  if (!token) return false;
  const [version, timestampText, signature, ...extra] = token.split(".");
  if (version !== LEGAL_POLICY_VERSION || !timestampText || !signature || extra.length > 0) return false;

  const timestamp = Number(timestampText);
  const age = Date.now() - timestamp;
  if (!Number.isSafeInteger(timestamp) || age < 0 || age > LEGAL_CONSENT_MAX_AGE_SECONDS * 1000) {
    return false;
  }

  const expected = Buffer.from(sign(`${version}.${timestampText}`));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}