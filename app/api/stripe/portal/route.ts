import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAppUrl, getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/stripe/portal — Customer Portal session for self-service
 * upgrades, downgrades, cancellation, and payment-method updates.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let stripeCustomerId: string | null = null;
  try {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    stripeCustomerId = (profile?.stripe_customer_id as string | null) ?? null;
  } catch {
    return NextResponse.json({ error: "Billing lookup failed." }, { status: 503 });
  }

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer yet. Start checkout first." },
      { status: 404 }
    );
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getAppUrl()}/subscribe`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    console.error("[stripe/portal] failed to create portal session.");
    return NextResponse.json(
      { error: "Unable to open billing portal. Please try again." },
      { status: 502 }
    );
  }
}
