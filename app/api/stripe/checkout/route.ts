import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getAppUrl,
  getStripeClient,
  getStripePriceId,
  randomIntegrationSuffix,
} from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/stripe/checkout — create a Billing subscription Checkout Session.
 * Body: { plan?: "monthly" | "annual" }
 * Requires auth. Does NOT require an active entitlement so expired-trial
 * users can subscribe. Uses dynamic payment methods (no payment_method_types).
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let plan = "monthly";
  try {
    const body = (await request.json().catch(() => null)) as { plan?: string } | null;
    if (body?.plan === "annual" || body?.plan === "monthly") plan = body.plan;
  } catch {
    // Default to monthly on unreadable body.
  }

  let priceId: string;
  try {
    priceId = getStripePriceId(plan);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Billing is not configured." },
      { status: 503 }
    );
  }

  const appUrl = getAppUrl();
  const stripe = getStripeClient();

  // Reuse the stored Stripe customer when available so webhooks map cleanly.
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
    stripeCustomerId = null;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Dynamic payment methods: omit payment_method_types entirely.
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe?canceled=1`,
      integration_identifier: `ccao-subscribe-${randomIntegrationSuffix()}`,
      ...(stripeCustomerId
        ? { customer: stripeCustomerId }
        : {
            customer_email: user.email,
            subscription_data: { metadata: { supabase_user_id: user.id } },
          }),
      metadata: { supabase_user_id: user.id, plan },
      ...(stripeCustomerId
        ? { subscription_data: { metadata: { supabase_user_id: user.id } } }
        : {}),
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[stripe/checkout] failed to create session.");
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 502 }
    );
  }
}
