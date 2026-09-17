import { BigQuery } from "@google-cloud/bigquery";
import { CloudBillingClient } from "@google-cloud/billing";
import type { GcpCredentials } from "./types";

// [MANUAL_SETUP_REQUIRED]: GCP project ID to monitor (e.g. my-production-project).
const envProjectId: string | undefined = process.env.GCP_PROJECT_ID;

// [MANUAL_SETUP_REQUIRED]: Service account email. IAM key JSON field is "client_email".
const envClientEmail: string | undefined = process.env.GCP_CLIENT_EMAIL;

// [MANUAL_SETUP_REQUIRED]: Service account key. IAM key JSON field is "private_key" (PEM block).
// Keep the literal \n sequences when stored in a single-line env file; they're unescaped here.
const envPrivateKey: string | undefined = process.env.GCP_PRIVATE_KEY;

// [MANUAL_SETUP_REQUIRED]: Full BigQuery table path, e.g. my-billing-proj.billing_export.gcp_billing_export_v1_XXXX.
const envBigQueryTable: string | undefined = process.env.GCP_BIGQUERY_TABLE;

// [MANUAL_SETUP_REQUIRED]: Project hosting the BigQuery export (blank = same as GCP_PROJECT_ID).
const envBigQueryProject: string | undefined =
  process.env.GCP_BIGQUERY_PROJECT || envProjectId;

// [MANUAL_SETUP_REQUIRED]: BigQuery dataset location (e.g. US/EU) or blank for default.
const envBigQueryLocation: string | undefined = process.env.GCP_BIGQUERY_LOCATION;

// [MANUAL_SETUP_REQUIRED]: Billing account funding the project, format billingAccounts/XXXXXX-XXXXXX-XXXXXX.
const envBillingAccountId: string | undefined = process.env.GCP_BILLING_ACCOUNT_ID;

export function isGcpConfigured(): boolean {
  return Boolean(environmentCreds());
}

function environmentCreds(): GcpCredentials | null {
  if (!envClientEmail || !envPrivateKey) return null;
  return { client_email: envClientEmail, private_key: envPrivateKey };
}

/** Accepts both `\n`-escaped single-line env values and real multi-line PEM blocks. */
function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

/** Resolves credentials for the monitored project: env first, then decrypted per-account creds. */
export function resolveCredentials(
  stored?: GcpCredentials | null
): GcpCredentials | null {
  return stored ?? environmentCreds();
}

function credsForSdk(creds: GcpCredentials): { client_email: string; private_key: string } {
  return {
    client_email: creds.client_email,
    private_key: normalizePrivateKey(creds.private_key),
  };
}

// ---------------------------------------------------------------------------
// Project billing info (confirm/cancel billing linkage)
// ---------------------------------------------------------------------------

/** Current billing state for a project: billingEnabled + billingAccountName. */
export async function getProjectBillingInfo(
  projectId: string,
  storedCreds?: GcpCredentials | null
): Promise<{
  billingEnabled: boolean;
  billingAccountName: string | null;
  projectId: string;
}> {
  const creds = resolveCredentials(storedCreds);
  if (!creds) {
    throw new Error(
      "GCP credentials unset. Set GCP_CLIENT_EMAIL / GCP_PRIVATE_KEY (or store an account in the dashboard)."
    );
  }
  const client = credsToBillingClient(creds);
  const [info] = await client.getProjectBillingInfo({
    name: `projects/${projectId}`,
  });
  return {
    billingEnabled: info.billingEnabled ?? false,
    billingAccountName: info.billingAccountName ?? null,
    projectId,
  };
}

/**
 * Disables billing on a project by setting an empty billing account.
 * This is the "hard cap / auto-kill" primitive. Requires roles/billing.projectManager.
 */
export async function disableProjectBilling(
  projectId: string,
  storedCreds?: GcpCredentials | null
): Promise<{ billingEnabled: boolean; projectId: string }> {
  const creds = resolveCredentials(storedCreds);
  if (!creds) {
    throw new Error("GCP credentials unset. Cannot disable project billing.");
  }
  const client = credsToBillingClient(creds);
  const [updated] = await client.updateProjectBillingInfo({
    name: `projects/${projectId}`,
    projectBillingInfo: { billingAccountName: "" },
  });
  return {
    billingEnabled: updated.billingEnabled ?? false,
    projectId,
  };
}

/** Re-attaches an existing billing account to a project (undo of the auto-kill). */
export async function enableProjectBilling(
  projectId: string,
  billingAccountId: string,
  storedCreds?: GcpCredentials | null
): Promise<{ billingEnabled: boolean; projectId: string }> {
  const creds = resolveCredentials(storedCreds);
  if (!creds) {
    throw new Error("GCP credentials unset. Cannot enable project billing.");
  }
  const client = credsToBillingClient(creds);
  const [updated] = await client.updateProjectBillingInfo({
    name: `projects/${projectId}`,
    projectBillingInfo: { billingAccountName: billingAccountId },
  });
  return {
    billingEnabled: updated.billingEnabled ?? false,
    projectId,
  };
}

// ---------------------------------------------------------------------------
// Current spend from the BigQuery billing export
// ---------------------------------------------------------------------------

export interface SpendQueryOptions {
  /** Full table path `project.dataset.table`. */
  table?: string;
  /** Project whose cost to sum; defaults to GCP_PROJECT_ID. */
  projectId?: string;
}

/**
 * Returns the accumulated cost for the current window using the standard
 * BigQuery billing export. Window matches the `interval` parameter of a budget.
 */
export async function fetchCurrentSpend(
  interval: "hourly" | "daily" | "monthly" = "hourly",
  options: SpendQueryOptions = {},
  storedCreds?: GcpCredentials | null
): Promise<number | null> {
  const creds = resolveCredentials(storedCreds);
  const table = options.table ?? envBigQueryTable;
  const projectId = options.projectId ?? envProjectId;
  const queryProject = envBigQueryProject ?? projectId;

  if (!creds || !table || !projectId) {
    return null; // Not configured. The caller decides how to handle it.
  }

  const duration =
    interval === "hourly"
      ? "INTERVAL 1 HOUR"
      : interval === "daily"
        ? "INTERVAL 1 DAY"
        : "INTERVAL 1 MONTH";

  const query = `
    SELECT
      ROUND(SUM(cost), 6) AS total
    FROM \`${table}\`
    WHERE project.id = @projectId
      AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), ${duration})
  `;

  const bigquery = new BigQuery({
    projectId: queryProject,
    credentials: credsForSdk(creds),
    location: envBigQueryLocation || undefined,
  });

  const [rows] = await bigquery.query({
    query,
    params: { projectId },
    useLegacySql: false,
  });

  const total = rows?.[0]?.total ?? null;
  return typeof total === "number" ? total : total != null ? Number(total) : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function credsToBillingClient(creds: GcpCredentials): CloudBillingClient {
  return new CloudBillingClient({
    credentials: credsForSdk(creds),
  });
}