import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkUserEntitlement, entitlementRequiredResponse } from "@/lib/entitlementServer";
import type { Budget, CostLog, SpendSnapshot } from "@/lib/types";

export const runtime = "nodejs";
const MAX_BUDGETS_PER_USER = 20;
const MAX_AUTO_KILL_BUDGETS_PER_USER = 5;
const MAX_ALERT_RECIPIENTS_PER_BUDGET = 5;

interface BudgetWithSpend extends Budget {
  latest_spend?: SpendSnapshot | null;
}

/** GET /api/budgets: the signed-in user's budgets, each with its latest cost sample. */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const entitlement = await checkUserEntitlement(user.id);
  if (!entitlement.entitled) {
    return NextResponse.json(entitlementRequiredResponse(entitlement.status), {
      status: 402,
    });
  }

  const { data: budgets, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load budgets." },
      { status: 500 }
    );
  }

  const withSpend = await Promise.all(
    ((budgets as Budget[]) ?? []).map(async (budget) => {
      const { data: latest } = await supabase
        .from("cost_logs")
        .select("*")
        .eq("budget_id", budget.id)
        .eq("interval_type", budget.period)
        .order("sampled_at", { ascending: false })
        .limit(1);

      const log = (latest as CostLog[] | null)?.[0];
      const rec: BudgetWithSpend = {
        ...budget,
        latest_spend: log
          ? {
              amount: Number(log.amount),
              currency: log.currency,
              window: log.interval_type,
              sampledAt: log.sampled_at,
            }
          : null,
      };
      return rec;
    })
  );

  return NextResponse.json({ budgets: withSpend });
}

interface CreateBudgetBody {
  name?: string;
  budget_name?: string;
  provider?: string;
  gcp_account_id?: string | null;
  openai_account_id?: string | null;
  openaiAccountId?: string | null;
  awsAccountId?: string | null;
  account_id?: string | null;
  accountId?: string | null;
  aws_account?: string | { id?: string | null } | null;
  account?: string | { id?: string | null } | null;
  ""?: string | null;
  aws_account_id?: string | null;
  threshold_amount?: number | string;
  dollar_limit?: number | string;
  amount?: number | string;
  currency?: string;
  auto_kill?: boolean;
  alert_emails?: string[];
  period?: "hourly" | "daily" | "monthly";
  compare_window?: "hourly" | "daily" | "monthly";
  alert_email_consent?: boolean;
}

/** POST /api/budgets: create a budget for the signed-in user. */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const postEntitlement = await checkUserEntitlement(user.id);
  if (!postEntitlement.entitled) {
    return NextResponse.json(entitlementRequiredResponse(postEntitlement.status), {
      status: 402,
    });
  }

  let body: CreateBudgetBody;
  try {
    body = (await request.json()) as CreateBudgetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.alert_emails !== undefined &&
    (!Array.isArray(body.alert_emails) || body.alert_emails.some((email) => typeof email !== "string"))) {
    return NextResponse.json({ error: "alert_emails must contain email strings." }, { status: 400 });
  }
  const alertEmails = Array.isArray(body.alert_emails)
    ? body.alert_emails.map((email) => email.trim()).filter(Boolean)
    : [];
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

  const threshold = Number(body.dollar_limit ?? body.amount ?? body.threshold_amount);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number." },
      { status: 400 }
    );
  }

  const period = body.compare_window ?? body.period ?? "hourly";
  if (!["hourly", "daily", "monthly"].includes(period)) {
    return NextResponse.json(
      { error: "period must be hourly, daily or monthly." },
      { status: 400 }
    );
  }

  const rawProvider = (body.provider || "").toLowerCase();
  const isAws = rawProvider === "aws" || rawProvider.includes("amazon");
  const provider = isAws ? "aws" : rawProvider;
  if (provider !== "gcp" && provider !== "aws" && provider !== "openai") {
    return NextResponse.json(
      { error: "provider must be gcp, aws, or openai." },
      { status: 400 }
    );
  }

  const { count: budgetCount, error: budgetCountError } = await supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (budgetCountError) {
    return NextResponse.json({ error: "Unable to verify budget quota." }, { status: 503 });
  }
  if ((budgetCount ?? 0) >= MAX_BUDGETS_PER_USER) {
    return NextResponse.json(
      { error: `Budget limit reached (${MAX_BUDGETS_PER_USER} budgets per user).` },
      { status: 429 }
    );
  }

  if (body.auto_kill) {
    const { count: autoKillCount, error: autoKillCountError } = await supabase
      .from("budgets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("active", true)
      .eq("auto_kill", true);
    if (autoKillCountError) {
      return NextResponse.json({ error: "Unable to verify automatic-action quota." }, { status: 503 });
    }
    if ((autoKillCount ?? 0) >= MAX_AUTO_KILL_BUDGETS_PER_USER) {
      return NextResponse.json(
        { error: `Automatic actions are limited to ${MAX_AUTO_KILL_BUDGETS_PER_USER} active budgets per user.` },
        { status: 429 }
      );
    }
  }

  const gcpAccountId = provider === "gcp" ? body.gcp_account_id || null : null;
  const openaiAccountId = provider === "openai"
    ? body.openai_account_id || body.openaiAccountId || body.account_id || body.accountId || null
    : null;
  const awsAccountValue =
    body.aws_account_id ||
    body.awsAccountId ||
    body.account_id ||
    body.accountId ||
    body.aws_account ||
    body.account ||
    body[""] ||
    null;
  const awsAccountId = typeof awsAccountValue === "string"
    ? awsAccountValue
    : awsAccountValue?.id || null;

  if (isAws && !awsAccountId) {
    return NextResponse.json(
      { error: "aws_account_id is required. Received payload had no valid account ID." },
      { status: 400 }
    );
  }

  switch (provider) {
    case "gcp": {
      if (gcpAccountId) {
        const { data: account, error } = await supabase
          .from("gcp_accounts")
          .select("id, provider")
          .eq("id", gcpAccountId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error || !account || account.provider !== "gcp") {
          return NextResponse.json(
            { error: "gcp_account_id does not belong to the current user." },
            { status: 403 }
          );
        }
      }
      break;
    }
    case "openai": {
      if (!openaiAccountId) {
        return NextResponse.json(
          { error: "openai_account_id is required." },
          { status: 400 }
        );
      }
      const { data: account, error } = await getSupabaseAdmin()
        .from("openai_accounts")
        .select("id")
        .eq("id", openaiAccountId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !account) {
        return NextResponse.json(
          { error: "openai_account_id does not belong to the current user." },
          { status: 403 }
        );
      }
      break;
    }
    case "aws": {
      const admin = getSupabaseAdmin();
      const { data: linkedAccount, error: linkedAccountError } = await admin
        .from("gcp_accounts")
        .select("id, user_id")
        .eq("id", awsAccountId)
        .eq("provider", "aws")
        .maybeSingle();

      if (linkedAccountError) {
        console.error("[api/budgets] AWS linked-account lookup failed.");
        return NextResponse.json(
          { error: "Failed to validate AWS account." },
          { status: 500 }
        );
      }
      if (linkedAccount) {
        if (linkedAccount.user_id !== user.id) {
          return NextResponse.json(
            { error: "aws_account_id does not belong to the current user." },
            { status: 403 }
          );
        }
        break;
      }

      const { data: account, error } = await admin
        .from("aws_accounts")
        .select("id, user_id")
        .eq("id", awsAccountId)
        .maybeSingle();
      if (error) {
        console.error("[api/budgets] AWS account lookup failed.");
        return NextResponse.json(
          { error: "Failed to validate AWS account." },
          { status: 500 }
        );
      }
      if (!account || account.user_id !== user.id) {
        return NextResponse.json(
          { error: "aws_account_id does not belong to the current user." },
          { status: 403 }
        );
      }
      break;
    }
  }

  const budgetPayload = {
    user_id: user.id,
    name: body.budget_name?.trim() || body.name?.trim() || "Default budget",
    provider,
    gcp_account_id: provider === "gcp" ? gcpAccountId : null,
    openai_account_id: provider === "openai" ? openaiAccountId : null,
    aws_account_id: provider === "aws" ? awsAccountId : null,
    threshold_amount: threshold,
    currency: body.currency || "USD",
    auto_kill: Boolean(body.auto_kill),
    alert_emails: alertEmails,
    alert_email_consent_at: alertEmails.length > 0 ? new Date().toISOString() : null,
    period,
    active: true,
  };

  const { data: created, error } = await supabase
    .from("budgets")
    .insert(budgetPayload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23514") {
      return NextResponse.json({ error: "A configured budget or alert quota was exceeded." }, { status: 429 });
    }
    return NextResponse.json(
      { error: "Failed to create budget." },
      { status: 500 }
    );
  }

  return NextResponse.json({ budget: created }, { status: 201 });
}