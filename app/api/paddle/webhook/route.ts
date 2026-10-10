import { NextResponse } from "next/server";
import { EventName } from "@paddle/paddle-node-sdk";
import { getPaddle } from "@/lib/paddle";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * POST /api/paddle/webhook — required for subscriptions.
 * Verifies the `paddle-signature` header, then syncs subscription state
 * into Supabase profiles. Fulfillment happens here, never on the
 * success page. Only a 2xx marks an event delivered — every non-2xx
 * (including signature failures) is retried by Paddle.
 *
 * Handlers are idempotent: Paddle delivers at-least-once, so updates are
 * keyed on stable Paddle resource ids and safe to replay.
 */

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  return (value ?? {}) as LooseRecord;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function customDataUserId(data: LooseRecord): string | null {
  const custom = asRecord(data["customData"] ?? data["custom_data"]);
  return str(custom["supabase_user_id"]);
}

function toIso(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Map Paddle subscription status to the local entitlement vocabulary. */
function mapStatus(status: unknown): string {
  switch (String(status ?? "").toLowerCase()) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return "expired";
  }
}

async function updateByUserId(userId: string, patch: LooseRecord) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) console.error("[paddle/webhook] profile update by user failed.");
}

async function updateByCustomerId(
  customerId: string,
  patch: LooseRecord,
  fallbackUserId?: string | null
) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .update(patch)
    .eq("paddle_customer_id", customerId)
    .select("id");
  if (error) {
    console.error("[paddle/webhook] profile update by customer failed.");
    return;
  }
  if ((!data || data.length === 0) && fallbackUserId) {
    await updateByUserId(fallbackUserId, {
      paddle_customer_id: customerId,
      ...patch,
    });
  }
}

function subscriptionPatch(data: LooseRecord): LooseRecord {
  const items = Array.isArray(data["items"]) ? (data["items"] as LooseRecord[]) : [];
  const firstItem = items[0] ?? {};
  const price = asRecord(firstItem["price"]);
  const period = asRecord(data["currentBillingPeriod"] ?? data["current_billing_period"]);
  return {
    paddle_customer_id: str(data["customerId"] ?? data["customer_id"]),
    paddle_subscription_id: str(data["id"]),
    subscription_status: mapStatus(data["status"]),
    subscription_price_id: str(price["id"]),
    subscription_current_period_end: toIso(period["endsAt"] ?? period["ends_at"]),
  };
}

async function handleSubscription(data: LooseRecord) {
  const patch = subscriptionPatch(data);
  const customerId = str(patch["paddle_customer_id"]);
  const fallbackUserId = customDataUserId(data);
  if (!customerId) {
    if (fallbackUserId) {
      const { paddle_customer_id: _omit, ...rest } = patch;
      await updateByUserId(fallbackUserId, rest);
    }
    return;
  }
  await updateByCustomerId(customerId, patch, fallbackUserId);
}

async function handleTransaction(data: LooseRecord) {
  const subscriptionId = str(data["subscriptionId"] ?? data["subscription_id"]);
  const fallbackUserId = customDataUserId(data);
  if (subscriptionId) {
    try {
      const paddle = getPaddle();
      const subscription = await paddle.subscriptions.get(subscriptionId);
      await handleSubscription(asRecord(subscription));
      return;
    } catch {
      console.error("[paddle/webhook] subscription fetch for transaction failed.");
    }
  }
  const customerId = str(data["customerId"] ?? data["customer_id"]);
  if (customerId) {
    await updateByCustomerId(customerId, { paddle_customer_id: customerId }, fallbackUserId);
  } else if (fallbackUserId && subscriptionId) {
    await updateByUserId(fallbackUserId, {
      paddle_subscription_id: subscriptionId,
    });
  }
}

async function handleCustomer(data: LooseRecord) {
  const customerId = str(data["id"]);
  const fallbackUserId = customDataUserId(data);
  if (!customerId) return;
  if (fallbackUserId) {
    await updateByUserId(fallbackUserId, { paddle_customer_id: customerId });
  } else {
    await updateByCustomerId(customerId, { paddle_customer_id: customerId });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET ?? "";

  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body." }, { status: 400 });
  }
  if (!secret) {
    return NextResponse.json({ error: "Webhooks not configured." }, { status: 503 });
  }

  try {
    const paddle = getPaddle();
    const event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
    const data = asRecord(event.data);

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionCanceled:
        await handleSubscription(data);
        break;
      case EventName.TransactionCompleted:
      case EventName.TransactionPaid:
        await handleTransaction(data);
        break;
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated:
        await handleCustomer(data);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[paddle/webhook] handler error.");
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
