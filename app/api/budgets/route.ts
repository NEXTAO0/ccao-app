import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { Budget, CostLog, SpendSnapshot } from "@/lib/types";

export const runtime = "nodejs";

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
  provider?: "gcp" | "aws" | "openai";
  gcp_account_id?: string | null;
  threshold_amount?: number | string;
  currency?: string;
  auto_kill?: boolean;
  alert_emails?: string[];
  period?: "hourly" | "daily" | "monthly";
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

  let body: CreateBudgetBody;
  try {
    body = (await request.json()) as CreateBudgetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const threshold = Number(body.threshold_amount);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return NextResponse.json(
      { error: "threshold_amount must be a positive number." },
      { status: 400 }
    );
  }

  const period = body.period ?? "hourly";
  if (!["hourly", "daily", "monthly"].includes(period)) {
    return NextResponse.json(
      { error: "period must be hourly, daily or monthly." },
      { status: 400 }
    );
  }

  const provider = body.provider ?? "gcp";
  if (provider !== "gcp" && provider !== "aws" && provider !== "openai") {
    return NextResponse.json(
      { error: "provider must be gcp, aws, or openai." },
      { status: 400 }
    );
  }

  let gcpAccountOwned = true;
  if (body.gcp_account_id) {
    const { data: account, error } = await supabase
      .from("gcp_accounts")
      .select("id, provider")
      .eq("id", body.gcp_account_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !account || account.provider !== provider) gcpAccountOwned = false;
  } else if (provider !== "gcp") {
    gcpAccountOwned = false;
  }
  if (!gcpAccountOwned) {
    return NextResponse.json(
      { error: "gcp_account_id does not belong to the current user." },
      { status: 403 }
    );
  }

  const payload = {
    user_id: user.id,
    name: body.name?.trim() || "Default budget",
    provider,
    gcp_account_id: body.gcp_account_id ?? null,
    threshold_amount: threshold,
    currency: body.currency ?? "USD",
    auto_kill: body.auto_kill ?? false,
    alert_emails: Array.isArray(body.alert_emails)
      ? body.alert_emails.map((e) => e.trim()).filter(Boolean)
      : [],
    period,
    active: true,
  };

  const { data: created, error } = await supabase
    .from("budgets")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create budget." },
      { status: 500 }
    );
  }

  return NextResponse.json({ budget: created }, { status: 201 });
}