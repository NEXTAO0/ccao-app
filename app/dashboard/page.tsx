import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { AlertLog, Budget, CostLog, SpendSnapshot } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Monitor GCP, AWS, and OpenAI spend, arm budget hard caps, and review anomaly alerts.",
  robots: { index: false, follow: false },
};

interface AccountSummary {
  id: string;
  provider: "gcp" | "aws" | "openai";
  name: string;
  project_id: string;
  api_key_id?: string | null;
  billing_account_id: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  budgets: Array<Budget & { latest_spend?: SpendSnapshot | null }>;
  accounts: AccountSummary[];
  alerts: AlertLog[];
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: budgets }, { data: accounts }, { data: alerts }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("gcp_accounts")
        .select("id, provider, name, project_id, api_key_id, billing_account_id, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("alert_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  // Attach each budget's latest cost sample. There are usually only a few budgets.
  const withSpend: DashboardData["budgets"] = [];
  for (const budget of (budgets as Budget[]) ?? []) {
    const { data: latest } = await supabase
      .from("cost_logs")
      .select("*")
      .eq("budget_id", budget.id)
      .eq("interval_type", budget.period)
      .order("sampled_at", { ascending: false })
      .limit(1);
    const log = (latest as CostLog[] | null)?.[0];
    withSpend.push({
      ...budget,
      latest_spend: log
        ? {
            amount: Number(log.amount),
            currency: log.currency,
            window: log.interval_type,
            sampledAt: log.sampled_at,
          }
        : null,
    });
  }

  const data: DashboardData = {
    budgets: withSpend,
    accounts: (accounts as AccountSummary[]) ?? [],
    alerts: (alerts as AlertLog[]) ?? [],
  };

  return <DashboardClient user={user} data={data} />;
}