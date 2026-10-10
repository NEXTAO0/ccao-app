import Stripe from "stripe";

// Latest Stripe API version per stripe-best-practices skill.
const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-09-30.endive";

let stripeClient: Stripe | null = null;

/**
 * Server-only Stripe client (StripeClient pattern — no global API key).
 * Uses a restricted key (rk_) with least privilege when available.
 */
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (!secretKey) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY (prefer a restricted key)."
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
    });
  }
  return stripeClient;
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export function getStripePriceId(plan: string): string {
  const normalized = plan.toLowerCase();
  if (normalized === "annual") {
    const price = process.env.STRIPE_PRICE_ANNUAL ?? "";
    if (!price) throw new Error("Missing STRIPE_PRICE_ANNUAL for the annual plan.");
    return price;
  }
  const price = process.env.STRIPE_PRICE_MONTHLY ?? "";
  if (!price) throw new Error("Missing STRIPE_PRICE_MONTHLY for the monthly plan.");
  return price;
}

/** Random 8-letter suffix for integration_identifier (API >= 2026-03-25.dahlia). */
export function randomIntegrationSuffix(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
