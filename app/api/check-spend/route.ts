import { NextResponse } from "next/server";
import { detectAnomaly } from "@/lib/anomaly";
import { decryptGcpCredentials, decryptSecret } from "@/lib/crypto";
import { buildAlertEmailHtml, sendEmail } from "@/lib/email";
import { freezeAwsAccount, getAwsMonthToDateSpend } from "@/lib/awsBilling";
import { getOpenAiMonthToDateSpend, revokeOpenAiApiKey } from "@/lib/openaiBilling";
import {
  disableProjectBilling,
  fetchCurrentSpend,
  getProjectBillingInfo,
} from "@/lib/gcpBilling";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabaseAdmin";
import type {
  AlertType,
  Budget,
  CheckResult,
  CostLog,
  GcpAccount,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// [MANUAL_SETUP_REQUIRED]: CRON_SECRET guards this endpoint. Vercel Cron sends it as
// `Authorization: Bearer $CRON_SECRET`. Generate: openssl rand -hex 32.
const cronSecret: string | undefined = process.env.CRON_SECRET;

// [MANUAL_SETUP_REQUIRED]: Base URL used in alert emails (e.g. https://ccao.vercel.app).
const appUrl: string | undefined =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// [MANUAL_SETUP_REQUIRED]: Optional catch-all recipient in `.env.local`.
const defaultAlertEmail: string | undefined = process.env.EMAIL_TO;

interface BudgetWithAccount extends Budget {
  gcp_accounts?: GcpAccount | GcpAccount[] | null;
  aws_iam_username?: string | null;
  openai_api_key_id?: string | null;
}

function normalizeAccount(row: BudgetWithAccount): GcpAccount | null {
  const account = row.gcp_accounts;
  if (Array.isArray(account)) return account[0] ?? null;
  return account ?? null;
}

function isAuthorized(authHeader: string | null): boolean {
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * POST /api/check-spend: the automated budget enforcement and anomaly webhook.
 *
 * Reaching it:
 *   - Vercel Cron (see vercel.json) sends `Authorization: Bearer $CRON_SECRET`.
 *   - Any client with the secret can trigger a full sweep.
 *
 * Behavior per active budget:
 *   1. Fetch current spend (BigQuery billing export).
 *   2. Persist a cost_log sample.
 *   3. If spend >= threshold → auto-kill (detach billing) when auto_kill is on,
 *      otherwise a budget_breach alert; email the recipients.
 *   4. Run anomaly detection vs. recent samples → anomaly_spike email.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured. See SETUP_GUIDE.md." },
      { status: 503 }
    );
  }

  const auth = isAuthorized(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: budgets, error: budgetError } = await admin
    .from("budgets")
    .select("*, gcp_accounts(*)")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (budgetError) {
    console.error("[check-spend] failed to load budgets", budgetError);
    return NextResponse.json(
      { error: "Failed to load budgets." },
      { status: 500 }
    );
  }

  const results: CheckResult[] = [];
  const total = (budgets as BudgetWithAccount[])?.length ?? 0;

  for (const row of (budgets as BudgetWithAccount[]) ?? []) {
    const provider = row.provider ?? "gcp";
    const account = normalizeAccount(row);
    const projectId = account?.project_id ?? process.env.GCP_PROJECT_ID ?? row.gcp_account_id;
    const storedCreds = account?.credentials_encrypted
      ? decryptGcpCredentials(account.credentials_encrypted)
      : null;

    const result = await checkOneBudget({
      admin,
      budget: row,
      provider,
      account,
      projectId: projectId ?? "",
      awsIamUsername: row.aws_iam_username ?? process.env.AWS_IAM_USERNAME ?? "",
      openaiApiKeyId: row.openai_api_key_id ?? account?.api_key_id ?? process.env.OPENAI_API_KEY_ID ?? "",
      openaiAdminKey:
        provider === "openai" && account?.credentials_encrypted
          ? decryptSecret(account.credentials_encrypted)
          : undefined,
      storedCreds,
    });
    results.push(result);
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    budgetsChecked: total,
    results,
  });
}

async function checkOneBudget(opts: {
  admin: ReturnType<typeof getSupabaseAdmin>;
  budget: BudgetWithAccount;
  provider: "gcp" | "aws" | "openai";
  account: GcpAccount | null;
  projectId: string;
  awsIamUsername: string;
  openaiApiKeyId: string;
  openaiAdminKey?: string;
  storedCreds:
    | {
        client_email: string;
        private_key: string;
      }
    | null;
}): Promise<CheckResult> {
  const {
    admin,
    budget,
    provider,
    projectId,
    awsIamUsername,
    openaiApiKeyId,
    openaiAdminKey,
    storedCreds,
  } = opts;
  const threshold = Number(budget.threshold_amount);

  const empty: CheckResult = {
    budget,
    spend: 0,
    threshold,
    breached: false,
    actionTaken: "none",
    emails: [],
  };

  if (provider === "gcp" && !projectId) {
    await insertAlert(admin, budget, "error", "warning",
      "Budget has no GCP project bound (no gcp_account and GCP_PROJECT_ID unset).",
      { reason: "missing_project" });
    return { ...empty, actionTaken: "none" };
  }

  if (provider === "aws" && !awsIamUsername && budget.auto_kill) {
    await insertAlert(admin, budget, "error", "warning",
      "AWS budget has no IAM username configured for auto-kill (set aws_iam_username or AWS_IAM_USERNAME).",
      { reason: "missing_aws_iam_username" });
  }

  if (provider === "openai" && !openaiApiKeyId && budget.auto_kill) {
    await insertAlert(admin, budget, "error", "warning",
      "OpenAI budget has no API key ID configured for auto-kill (set openai_api_key_id or OPENAI_API_KEY_ID).",
      { reason: "missing_openai_api_key_id" });
  }

  let spend: number | null = null;
  try {
    spend = provider === "aws"
      ? await getAwsMonthToDateSpend()
      : provider === "openai"
        ? await getOpenAiMonthToDateSpend(openaiAdminKey)
        : await fetchCurrentSpend(budget.period, { projectId }, storedCreds);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const target = provider === "aws"
      ? "AWS account"
      : provider === "openai"
        ? "OpenAI organization"
        : projectId;
    console.error(`[check-spend] spend query failed for ${target}:`, message);
    await insertAlert(admin, budget, "error", "warning",
      provider === "aws"
        ? "Could not read AWS spend. Verify the AWS Cost Explorer permissions."
        : provider === "openai"
          ? "Could not read OpenAI spend. Verify the Admin API key and Usage API permissions."
          : `Could not read spend for ${projectId}. Verify the BigQuery export is enabled.`,
      {
        reason: provider === "aws"
          ? "aws_cost_explorer_failure"
          : provider === "openai"
            ? "openai_usage_failure"
            : "bigquery_failure",
        error: message,
      });
  }

  // Persist a sample even when the read failed (amount 0 keeps history clean).
  if (spend != null) {
    await insertCostLog(admin, budget, spend);
  } else {
    return { ...empty, actionTaken: "none" };
  }

  const breached = spend >= threshold;
  const emails = recipients(budget);

  // --- Upstream check: if a prior run killed billing, notify to re-enable. ---
  if (breached && budget.auto_kill) {
    let killOutcome: "kill" | "already_disabled" | "error" = "kill";
    let disabledDetail: Record<string, unknown> = { spend, threshold };

    try {
      if (provider === "aws") {
        if (!awsIamUsername) {
          throw new Error("AWS IAM username is not configured.");
        }
        await freezeAwsAccount(awsIamUsername);
        disabledDetail = { spend, threshold, iamUserName: awsIamUsername };
      } else if (provider === "openai") {
        if (!openaiApiKeyId) {
          throw new Error("OpenAI API key ID is not configured.");
        }
        const revoked = await revokeOpenAiApiKey(openaiApiKeyId, openaiAdminKey);
        if (!revoked) {
          throw new Error(`OpenAI API key ${openaiApiKeyId} could not be revoked.`);
        }
        disabledDetail = { spend, threshold, apiKeyId: openaiApiKeyId };
      } else {
        const before = await checkBillingState(projectId, storedCreds);
        if (before.billingEnabled) {
          const after = await disableProjectBilling(projectId, storedCreds);
          disabledDetail = {
            spend,
            threshold,
            billingEnabledAfter: after.billingEnabled,
          };
          killOutcome = after.billingEnabled ? "error" : "kill";
        } else {
          killOutcome = "already_disabled";
          disabledDetail = { spend, threshold, reason: "billing already detached" };
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[check-spend] auto-kill failed for ${provider}:`, message);
      killOutcome = "error";
      disabledDetail = { spend, threshold, error: message };
    }

    const alertType: AlertType =
      killOutcome === "error"
        ? "budget_breach"
        : "billing_disabled";

    const message =
      killOutcome === "error"
        ? `Threshold exceeded on ${budget.name} but auto-kill could not be enforced. Manual intervention required.`
        : killOutcome === "already_disabled"
          ? `Threshold exceeded on ${budget.name}; billing already had been detached.`
          : provider === "openai"
            ? `Hard cap enforced: OpenAI spend on ${budget.name} crossed $${threshold}; the API key has been revoked.`
            : provider === "aws"
              ? `Hard cap enforced: AWS spend on ${budget.name} crossed $${threshold}; the IAM user has been frozen.`
              : `Hard cap enforced: spend on ${projectId} crossed $${threshold}, billing has been detached.`;

    await insertAlert(admin, budget, alertType, "critical", message, disabledDetail);

    if (killOutcome !== "error") {
      await sendBreakEmail(budget, projectId, spend, threshold, alertType, message);
    }
    return {
      budget,
      spend,
      threshold,
      breached,
      actionTaken: killOutcome === "error" ? "alert_only" : killOutcome,
      emails: killOutcome === "error" ? [] : emails,
    };
  }

  // --- Soft breach: notify (no auto-kill). ---
  if (breached) {
    const message = `Budget breach: ${budget.name} crossed $${threshold} on ${projectId} (current $${
      (spend ?? 0).toFixed(2)
    }).`;
    await insertAlert(admin, budget, "budget_breach", "warning", message, {
      spend,
      threshold,
    });
    await sendBreakEmail(budget, projectId, spend!, threshold, "budget_breach", message);
    return {
      budget,
      spend,
      threshold,
      breached,
      actionTaken: "alert_only",
      emails,
    };
  }

  // --- Anomaly detection (only when the budget is NOT already breached). ---
  const anomaly = await runAnomalyCheck(admin, budget, spend);
  let anomalyEmails: string[] = [];
  if (anomaly?.isAnomaly) {
    anomalyEmails = emails;
    await sendSpikeEmail(budget, projectId, anomaly);
  }

  return {
    budget,
    spend,
    threshold,
    breached,
    actionTaken: "none",
    anomaly,
    emails: anomalyEmails,
  };
}

async function checkBillingState(
  projectId: string,
  storedCreds: { client_email: string; private_key: string } | null
): Promise<{ billingEnabled: boolean }> {
  const info = await getProjectBillingInfo(projectId, storedCreds);
  return { billingEnabled: info.billingEnabled };
}

async function runAnomalyCheck(
  admin: ReturnType<typeof getSupabaseAdmin>,
  budget: Budget,
  spend: number
) {
  try {
    const { data: history } = await admin
      .from("cost_logs")
      .select("amount")
      .eq("budget_id", budget.id)
      .eq("interval_type", budget.period)
      .order("sampled_at", { ascending: false })
      .limit(48);
    const amounts = (history as CostLog[] | null)?.map((h) => Number(h.amount)) ?? [];
    const anomaly = detectAnomaly(spend, amounts);
    if (anomaly.isAnomaly) {
      await insertAlert(admin, budget, "anomaly_spike", "warning", anomaly.message, {
        zScore: anomaly.zScore,
        current: anomaly.current,
        mean: anomaly.mean,
        stdDev: anomaly.stdDev,
      });
    }
    return anomaly;
  } catch (err) {
    console.error("[check-spend] anomaly check failed", err);
    return null;
  }
}

async function insertAlert(
  admin: ReturnType<typeof getSupabaseAdmin>,
  budget: Budget,
  alertType: AlertType,
  severity: "info" | "warning" | "critical",
  message: string,
  details: Record<string, unknown>
) {
  const { error } = await admin.from("alert_logs").insert({
    user_id: budget.user_id,
    gcp_account_id: budget.gcp_account_id,
    budget_id: budget.id,
    alert_type: alertType,
    severity,
    message,
    details,
  });
  if (error) {
    console.error("[check-spend] failed to record alert", error.message);
  }
}

async function insertCostLog(
  admin: ReturnType<typeof getSupabaseAdmin>,
  budget: Budget,
  spend: number
) {
  const { error } = await admin.from("cost_logs").insert({
    user_id: budget.user_id,
    gcp_account_id: budget.gcp_account_id,
    budget_id: budget.id,
    amount: spend,
    currency: budget.currency,
    interval_type: budget.period,
    sampled_at: new Date().toISOString(),
    source: "bigquery",
  });
  if (error) {
    console.error("[check-spend] failed to persist cost log", error.message);
  }
}

function recipients(budget: Budget): string[] {
  const all = [...(budget.alert_emails ?? [])];
  if (defaultAlertEmail && !all.includes(defaultAlertEmail)) {
    all.push(defaultAlertEmail);
  }
  return [...new Set(all)];
}

async function sendBreakEmail(
  budget: Budget,
  projectId: string,
  spend: number,
  threshold: number,
  type: AlertType,
  message: string
) {
  const to = recipients(budget);
  if (to.length === 0) return;
  const title =
    type === "billing_disabled"
      ? "Hard cap enforced · Billing detached"
      : "Budget breached";
  const action =
    type === "billing_disabled"
      ? "Billing account detached from project"
      : "No auto-kill configured: review spending";
  const html = buildAlertEmailHtml({
    title,
    message,
    budgetName: budget.name,
    projectId,
    spend: spend.toFixed(2),
    threshold: threshold.toFixed(2),
    action,
    dashboardUrl: `${appUrl}/dashboard`,
  });
  const result = await sendEmail({
    to,
    subject: title,
    html,
    text: message,
  });
  if (result.error) {
    console.error("[check-spend] alert email failed", result.error);
  }
}

async function sendSpikeEmail(
  budget: Budget,
  projectId: string,
  anomaly: NonNullable<ReturnType<typeof detectAnomaly>>
) {
  const to = recipients(budget);
  if (to.length === 0) return;
  const html = buildAlertEmailHtml({
    title: "Anomaly spike detected",
    message: anomaly.message,
    budgetName: budget.name,
    projectId,
    spend: anomaly.current.toFixed(2),
    threshold: BudgetThresholdOf(budget).toFixed(2),
    action: "Monitoring: no billing change performed",
    dashboardUrl: `${appUrl}/dashboard`,
  });
  const result = await sendEmail({
    to,
    subject: "CCAO · Spend spike detected",
    html,
    text: anomaly.message,
  });
  if (result.error) {
    console.error("[check-spend] spike email failed", result.error);
  }
}

function BudgetThresholdOf(budget: Budget): number {
  return Number(budget.threshold_amount);
}

// GET is also accepted so a plain browser / uptime probe can hit the endpoint.
export async function GET(request: Request) {
  return POST(request);
}