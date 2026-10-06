alter table public.budgets
  add column if not exists alert_email_consent_at timestamptz;