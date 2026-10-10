import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook — required for subscriptions.
 * Fulfillment happens here, never on the success page.
 * Verify signatures before processing; allowlist Stripe IPs at the edge/proxy
 * in production (see Stripe security reference).
 */

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  return secret;
}

function toIsoFromUnix(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function customerIdFrom(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function subscriptionIdFrom(
  value: string | Stripe.Subscription | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function updateProfileByUserId(
  userId: string,
  patch: Record<string, string | null>
) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) console.error("[stripe/webhook] profile update by user failed.");
}

async function updateProfileByCustomerId(
  customerId: string,
  patch: Record<string, string | null>,
  fallbackUserId?: string | null
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .update(patch)
    .eq("stripe_customer_id", customerId)
    .select("id");
  if (error) {
    console.error("[stripe/webhook] profile update by customer failed.");
    return;
  }
  if ((!data || data.length === 0) && fallbackUserId) {
    await updateProfileByUserId(fallbackUserId, {
      stripe_customer_id: customerId,
      ...patch,
    });
  }
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const stripe = getStripeClient();
  // Resolve through the object graph: subscription is the ownership boundary.
  const full = await stripe.subscriptions.retrieve(subscription.id);
  const customerId = customerIdFrom(full.customer);
  const priceId = full.items.data[0]?.price?.id ?? null;
  const periodEnd = toIsoFromUnix(
    (full as unknown as { current_period_end?: number }).current_period_end
  );
  const status = full.status;
  const supabaseUserId =
    (full.metadata?.supabase_user_id as string | undefined) ?? null;
  if (!customerId) return;
  await updateProfileByCustomerId(
    customerId,
    {
      stripe_subscription_id: full.id,
      subscription_status: status,
      subscription_price_id: priceId,
      subscription_current_period_end: periodEnd,
    },
    supabaseUserId
  );
}

async function handleCheckoutSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe
) {
  // Gate on payment_status: delayed-notification methods complete while unpaid.
  if (session.payment_status === "unpaid") return;
  const customerId = customerIdFrom(
    session.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null
  );
  const subscriptionId = subscriptionIdFrom(
    session.subscription as string | Stripe.Subscription | null
  );
  const supabaseUserId = (session.metadata?.supabase_user_id as string | undefined) ?? null;
  if (!customerId) return;
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription(subscription);
  } else if (supabaseUserId) {
    await updateProfileByUserId(supabaseUserId, {
      stripe_customer_id: customerId,
    });
  }
}

async function handleInvoice(invoice: Stripe.Invoice, stripe: Stripe) {
  const subscriptionRef = (invoice as unknown as { subscription?: string | Stripe.Subscription | null })
    .subscription;
  const subscriptionId = subscriptionIdFrom(subscriptionRef);
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription(subscription);
    return;
  }
  // No subscription on invoice: still ensure customer mapping exists.
  const customerId = customerIdFrom(
    invoice.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null
  );
  if (customerId) {
    const admin = getSupabaseAdmin();
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("stripe_customer_id", customerId);
  }
}

async function handleRiskEvent(
  eventType: string,
  objectId: string,
  stripe: Stripe
) {
  // Resolve risk events through the object graph to the affected Subscription.
  // No automatic cancellation: surface for operator review.
  try {
    if (eventType === "charge.dispute.created") {
      const dispute = await stripe.disputes.retrieve(objectId);
      console.error("[stripe/webhook] dispute created.", {
        dispute: dispute.id,
        charge: typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id,
      });
      return;
    }
    if (eventType === "charge.refunded") {
      const charge = (await stripe.charges.retrieve(objectId)) as unknown as {
        invoice?: string | { id?: string } | null;
      };
      const invoiceId =
        typeof charge.invoice === "string" ? charge.invoice : charge.invoice?.id;
      if (invoiceId) {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        await handleInvoice(invoice, stripe);
      }
      return;
    }
    if (eventType === "radar.early_fraud_warning.created") {
      const warning = await stripe.radar.earlyFraudWarnings.retrieve(objectId);
      console.error("[stripe/webhook] early fraud warning.", {
        warning: warning.id,
        charge: typeof warning.charge === "string" ? warning.charge : warning.charge?.id,
      });
    }
  } catch {
    console.error("[stripe/webhook] risk event resolution failed.");
  }
}

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = getWebhookSecret();
  } catch {
    return NextResponse.json({ error: "Webhooks not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session, stripe);
        break;
      }
      case "checkout.session.async_payment_failed": {
        console.error("[stripe/webhook] async payment failed.");
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        await handleInvoice(event.data.object as Stripe.Invoice, stripe);
        break;
      }
      case "customer.updated": {
        const customer = event.data.object as Stripe.Customer;
        await updateProfileByCustomerId(customer.id, {
          stripe_customer_id: customer.id,
        });
        break;
      }
      case "charge.dispute.created":
      case "charge.refunded":
      case "radar.early_fraud_warning.created": {
        const obj = event.data.object as { id: string };
        await handleRiskEvent(event.type, obj.id, stripe);
        break;
      }
      default:
        break;
    }
  } catch {
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
