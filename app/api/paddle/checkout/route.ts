import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAppUrl, getPaddle, getPaddlePriceId } from "@/lib/paddle";

export const runtime = "nodejs";

/**
 * POST /api/paddle/checkout — create a Paddle transaction for a recurring
 * subscription and return its id for Paddle.js (`Checkout.open({ transactionId })`).
 * Body: { plan?: "monthly" | "annual" }
 * Requires auth. Does NOT require an active entitlement so expired-trial
 * users can subscribe. `custom_data.supabase_user_id` flows through every
 * subsequent webhook event for Supabase sync.
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
    priceId = getPaddlePriceId(plan);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Billing is not configured." },
      { status: 503 }
    );
  }

  let paddleCustomerId: string | null = null;
  try {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("paddle_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    paddleCustomerId = (profile?.paddle_customer_id as string | null) ?? null;
  } catch {
    paddleCustomerId = null;
  }

  try {
    const paddle = getPaddle();
    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: { supabase_user_id: user.id },
      ...(paddleCustomerId ? { customerId: paddleCustomerId } : {}),
      collectionMode: "automatic",
      checkout: { url: `${getAppUrl()}/pricing/success` },
    });

    return NextResponse.json({ transactionId: transaction.id, plan });
  } catch {
    console.error("[paddle/checkout] failed to create transaction.");
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 502 }
    );
  }
}
