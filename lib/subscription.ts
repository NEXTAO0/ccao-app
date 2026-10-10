import type { Entitlement, Profile, SubscriptionStatus } from "@/lib/types";

export const TRIAL_DAYS = 30;
const ENTITLED_STATUSES: ReadonlySet<string> = new Set(["active", "trialing"]);

/**
 * Pure entitlement check shared by Proxy (optimistic), pages, and API routes.
 * Entitled when:
 *  - subscription is active/trialing with a future period end, OR
 *  - subscription is active/trialing and the 30-day DB trial is still valid.
 */
export function getEntitlement(profile: Profile | null): Entitlement {
  if (!profile) {
    return {
      entitled: false,
      status: "expired",
      trialEnd: null,
      trialExpired: true,
      periodEnd: null,
    };
  }
  const status = (profile.subscription_status ?? "trialing") as SubscriptionStatus;
  const trialEnd = profile.trial_end ?? null;
  const periodEnd = profile.subscription_current_period_end ?? null;
  const now = Date.now();

  const trialValid = trialEnd ? Date.parse(trialEnd) > now : false;
  const periodValid = periodEnd ? Date.parse(periodEnd) > now : false;

  let entitled = false;
  if (ENTITLED_STATUSES.has(status)) {
    if (periodEnd) {
      entitled = periodValid;
    } else {
      entitled = trialValid;
    }
    // DB trial fallback keeps trialing users entitled pre-webhook.
    if (!entitled && trialValid) entitled = true;
  }

  return {
    entitled,
    status,
    trialEnd,
    trialExpired: trialEnd ? !trialValid : true,
    periodEnd,
  };
}

export function isEntitledProfile(profile: Profile | null): boolean {
  return getEntitlement(profile).entitled;
}

export function trialDaysRemaining(profile: Profile | null): number {
  if (!profile?.trial_end) return 0;
  const ms = Date.parse(profile.trial_end) - Date.now();
  return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
}
