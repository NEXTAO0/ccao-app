import { createHmac } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  limit: number;
}

export async function consumeRateLimit(
  identity: string,
  scope: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Rate limiting is not configured.");

  const keyHash = createHmac("sha256", secret)
    .update(`${scope}:${identity}`)
    .digest("hex");
  const { data, error } = await getSupabaseAdmin().rpc("consume_api_rate_limit", {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error || !Array.isArray(data) || !data[0]) {
    throw new Error("Rate limit storage is unavailable.");
  }

  return {
    allowed: Boolean(data[0].allowed),
    retryAfterSeconds: Number(data[0].retry_after_seconds),
    remaining: Number(data[0].remaining),
    limit,
  };
}

export function getClientAddress(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || headers.get("x-real-ip")?.trim() || "unknown";
}