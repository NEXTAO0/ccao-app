import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getEntitlement } from "@/lib/subscription";
import type { Profile } from "@/lib/types";

/**
 * Server-side entitlement verification before permitting core features.
 * Returns { entitled, status } — callers map !entitled to 402 + subscribe URL.
 */
export async function checkUserEntitlement(userId: string): Promise<{
  entitled: boolean;
  status: string;
}> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return { entitled: false, status: "expired" };
    const entitlement = getEntitlement(data as Profile);
    return { entitled: entitlement.entitled, status: entitlement.status };
  } catch {
    // Fail closed for paid features when billing state is unreadable.
    return { entitled: false, status: "expired" };
  }
}

export function entitlementRequiredResponse(status: string) {
  return {
    error: "Subscription required. Your 30-day trial has expired.",
    status,
    subscribeUrl: "/pricing",
  };
}
