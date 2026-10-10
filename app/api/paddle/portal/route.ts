import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getPaddle } from "@/lib/paddle";

export const runtime = "nodejs";

/**
 * POST /api/paddle/portal — Customer Portal session for self-service
 * upgrades, downgrades, cancellation, and payment-method updates.
 * Returns { url } for redirecting to Paddle's hosted portal.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let paddleCustomerId: string | null = null;
  let paddleSubscriptionId: string | null = null;
  try {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("paddle_customer_id, paddle_subscription_id")
      .eq("id", user.id)
      .maybeSingle();
    paddleCustomerId = (profile?.paddle_customer_id as string | null) ?? null;
    paddleSubscriptionId = (profile?.paddle_subscription_id as string | null) ?? null;
  } catch {
    return NextResponse.json({ error: "Billing lookup failed." }, { status: 503 });
  }

  if (!paddleCustomerId) {
    return NextResponse.json(
      { error: "No Paddle customer yet. Start checkout first." },
      { status: 404 }
    );
  }

  try {
    const paddle = getPaddle();
    const session = await paddle.customerPortalSessions.create(
      paddleCustomerId,
      paddleSubscriptionId ? [paddleSubscriptionId] : []
    );
    const url = session.urls?.general?.overview;
    if (!url) throw new Error("Portal session returned no URL.");
    return NextResponse.json({ url });
  } catch {
    console.error("[paddle/portal] failed to create portal session.");
    return NextResponse.json(
      { error: "Unable to open billing portal. Please try again." },
      { status: 502 }
    );
  }
}
