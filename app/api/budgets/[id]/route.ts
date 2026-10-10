import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { checkUserEntitlement, entitlementRequiredResponse } from "@/lib/entitlementServer";

export const runtime = "nodejs";
const MAX_AUTO_KILL_BUDGETS_PER_USER = 5;
const MAX_ALERT_RECIPIENTS_PER_BUDGET = 5;

type Params = { params: Promise<{ id: string }> };

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** PATCH /api/budgets/:id: update a budget (auto_kill toggle, threshold, email list). */
export async function PATCH(request: Request, { params }: Params) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const entitlement = await checkUserEntitlement(user.id);
  if (!entitlement.entitled) {
    return NextResponse.json(entitlementRequiredResponse(entitlement.status), {
      status: 402,
    });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};

  if (body.name !== undefined) allowed.name = String(body.name).trim();
  if (body.threshold_amount !== undefined) {
    const threshold = Number(body.threshold_amount);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      return NextResponse.json(
        { error: "threshold_amount must be a positive number." },
        { status: 400 }
      );
    }
    allowed.threshold_amount = threshold;
  }
  if (body.currency !== undefined) allowed.currency = String(body.currency);
  if (body.auto_kill !== undefined) allowed.auto_kill = Boolean(body.auto_kill);
  if (body.active !== undefined) allowed.active = Boolean(body.active);
  if (body.period !== undefined) {
    if (!["hourly", "daily", "monthly"].includes(String(body.period))) {
      return NextResponse.json(
        { error: "period must be hourly, daily or monthly." },
        { status: 400 }
      );
    }
    allowed.period = body.period;
  }
  if (body.alert_emails !== undefined) {
    if (!Array.isArray(body.alert_emails) || body.alert_emails.some((email) => typeof email !== "string")) {
      return NextResponse.json(
        { error: "alert_emails must contain email strings." },
        { status: 400 }
      );
    }
    const alertEmails = (body.alert_emails as string[])
      .map((e) => e.trim())
      .filter(Boolean);
    if (alertEmails.length > MAX_ALERT_RECIPIENTS_PER_BUDGET) {
      return NextResponse.json(
        { error: `A budget can have at most ${MAX_ALERT_RECIPIENTS_PER_BUDGET} alert recipients.` },
        { status: 400 }
      );
    }
    if (alertEmails.length > 0 && body.alert_email_consent !== true) {
      return NextResponse.json(
        { error: "Confirm permission for alert recipients before saving their email addresses." },
        { status: 400 }
      );
    }
    allowed.alert_emails = alertEmails;
    allowed.alert_email_consent_at = alertEmails.length > 0 ? new Date().toISOString() : null;
  }

  if (allowed.auto_kill === true || allowed.active === true) {
    const { data: currentBudget, error: currentBudgetError } = await supabase
      .from("budgets")
      .select("auto_kill, active")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (currentBudgetError) {
      return NextResponse.json({ error: "Unable to verify automatic-action quota." }, { status: 503 });
    }
    if (!currentBudget) {
      return NextResponse.json({ error: "Budget not found or not owned by the current user." }, { status: 404 });
    }

    const willBeAutoKill = (allowed.auto_kill as boolean | undefined) ?? currentBudget.auto_kill;
    const willBeActive = (allowed.active as boolean | undefined) ?? currentBudget.active;
    if (willBeAutoKill && willBeActive) {
      const { count, error } = await supabase
        .from("budgets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("active", true)
        .eq("auto_kill", true)
        .neq("id", id);
      if (error) {
        return NextResponse.json({ error: "Unable to verify automatic-action quota." }, { status: 503 });
      }
      if ((count ?? 0) >= MAX_AUTO_KILL_BUDGETS_PER_USER) {
        return NextResponse.json(
          { error: `Automatic actions are limited to ${MAX_AUTO_KILL_BUDGETS_PER_USER} active budgets per user.` },
          { status: 429 }
        );
      }
    }
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("budgets")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23514") {
      return NextResponse.json({ error: "A configured budget or alert quota was exceeded." }, { status: 429 });
    }
    return NextResponse.json(
      { error: "Failed to update budget." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "Budget not found or not owned by the current user." },
      { status: 404 }
    );
  }

  return NextResponse.json({ budget: data });
}

/** DELETE /api/budgets/:id: remove a budget. */
export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const delEntitlement = await checkUserEntitlement(user.id);
  if (!delEntitlement.entitled) {
    return NextResponse.json(entitlementRequiredResponse(delEntitlement.status), {
      status: 402,
    });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete budget." },
      { status: 500 }
    );
  }
  if (!data?.length) {
    return NextResponse.json(
      { error: "Budget not found or not owned by the current user." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}