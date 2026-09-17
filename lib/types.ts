// Shared TypeScript types for CCAO.

export type Currency = "USD" | "EUR" | "GBP" | "INR" | string;

export type BudgetPeriod = "hourly" | "daily" | "monthly";

export type CloudProvider = "gcp" | "aws" | "openai";

export type AlertType =
  | "budget_breach"
  | "anomaly_spike"
  | "billing_disabled"
  | "billing_reenabled"
  | "error";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GcpAccount {
  id: string;
  user_id: string;
  provider: CloudProvider;
  project_id: string;
  name: string;
  credentials_encrypted: string;
  api_key_id?: string | null;
  billing_account_id: string;
  created_at: string;
  updated_at: string;
}

/** Decrypted form. Never returned by the API. */
export interface GcpCredentials {
  client_email: string;
  private_key: string;
}

export interface Budget {
  id: string;
  user_id: string;
  provider: CloudProvider;
  gcp_account_id: string | null;
  name: string;
  threshold_amount: number;
  currency: Currency;
  auto_kill: boolean;
  alert_emails: string[];
  period: BudgetPeriod;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostLog {
  id: string;
  user_id: string;
  gcp_account_id: string | null;
  budget_id: string | null;
  amount: number;
  currency: Currency;
  interval_type: BudgetPeriod;
  sampled_at: string;
  source: string;
  created_at: string;
}

export interface AlertLog {
  id: string;
  user_id: string;
  gcp_account_id: string | null;
  budget_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
  emailed_to: string[];
  created_at: string;
}

export interface SpendSnapshot {
  amount: number;
  currency: Currency;
  window: BudgetPeriod;
  sampledAt: string;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  current: number;
  mean: number;
  stdDev: number;
  message: string;
}

export interface CheckResult {
  budget: Budget;
  spend: number;
  threshold: number;
  breached: boolean;
  actionTaken: "none" | "kill" | "alert_only" | "already_disabled";
  anomaly?: AnomalyResult | null;
  emails: string[];
}