-- ============================================================
-- CCAO — Cloud Controller by NEXTAO
-- Supabase PostgreSQL schema + Row Level Security
-- Apply in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ---------- extensions ----------
create extension if not exists "pgcrypto";

-- ============================================================
-- profiles  (mirrors auth.users, no RLS issues for queries)
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- SaaS billing entitlements (managed server-side via Stripe webhooks).
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'trialing',
  subscription_price_id text,
  subscription_current_period_end timestamptz,
  trial_start timestamptz not null default now(),
  trial_end timestamptz not null default (now() + interval '30 days')
);

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);
create index if not exists profiles_subscription_status_idx
  on public.profiles (subscription_status);
create index if not exists profiles_trial_end_idx
  on public.profiles (trial_end);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Minimal server-only record of accepted policy versions; no IP/device data.
create table if not exists public.legal_consents (
  user_id        uuid not null references auth.users (id) on delete cascade,
  terms_version  text not null,
  privacy_version text not null,
  accepted_at    timestamptz not null default now(),
  primary key (user_id, terms_version, privacy_version)
);

alter table public.legal_consents enable row level security;

-- HMAC-keyed request counters; raw addresses and user IDs are never stored here.
create table if not exists public.api_rate_limits (
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  primary key (key_hash, window_start)
);

create index if not exists api_rate_limits_expires_at_idx
  on public.api_rate_limits (expires_at);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;
grant all on public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_window_seconds < 1
    or p_window_seconds > 86400 then
    raise exception 'invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits as counters
    (key_hash, window_start, request_count, expires_at)
  values
    (p_key_hash, v_window_start, 1, v_window_start + make_interval(secs => p_window_seconds))
  on conflict (key_hash, window_start) do update
    set request_count = counters.request_count + 1
  returning request_count into v_count;

  if random() < 0.01 then
    delete from public.api_rate_limits where expires_at < v_now;
  end if;

  return query select
    v_count <= p_limit,
    greatest(1, ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now)))::integer),
    greatest(0, p_limit - v_count);
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

-- Keeps `profiles` in sync with new auth users (30-day free trial).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, subscription_status,
    trial_start, trial_end
  )
  values (
    new.id,
    coalesce(new.email, ''),
    'trialing',
    now(),
    now() + interval '30 days'
  )
  on conflict (id) do update set
    trial_start = coalesce(public.profiles.trial_start, excluded.trial_start),
    trial_end = coalesce(public.profiles.trial_end, excluded.trial_end);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- gcp_accounts  (encrypted service-account credentials)
-- ============================================================
create table if not exists public.gcp_accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  provider    text not null default 'gcp' check (provider in ('gcp', 'aws', 'openai')),
  project_id  text not null default '',
  name        text not null default '',
  -- Encrypted JSON blob (see lib/crypto.ts). Fields kept out of plaintext.
  credentials_encrypted text not null default '',
  api_key_id  text,
  billing_account_id text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.gcp_accounts
  add column if not exists provider text not null default 'gcp';

alter table public.gcp_accounts
  add column if not exists api_key_id text;

alter table public.gcp_accounts
  alter column project_id set default '';

alter table public.gcp_accounts
  drop constraint if exists gcp_accounts_provider_check;

alter table public.gcp_accounts
  add constraint gcp_accounts_provider_check check (provider in ('gcp', 'aws', 'openai'));

alter table public.gcp_accounts enable row level security;

create policy "gcp_accounts_select_own" on public.gcp_accounts
  for select using (auth.uid() = user_id);
create policy "gcp_accounts_insert_own" on public.gcp_accounts
  for insert with check (auth.uid() = user_id);
create policy "gcp_accounts_update_own" on public.gcp_accounts
  for update using (auth.uid() = user_id);
create policy "gcp_accounts_delete_own" on public.gcp_accounts
  for delete using (auth.uid() = user_id);

-- ============================================================
-- budgets  (threshold + hard-cap toggle + alert recipients)
-- ============================================================
create table if not exists public.budgets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  provider       text not null default 'gcp' check (provider in ('gcp', 'aws', 'openai')),
  gcp_account_id uuid references public.gcp_accounts (id) on delete cascade,
  openai_account_id uuid,
  aws_account_id uuid,
  name           text not null default 'Default budget',
  -- Threshold in the given currency; spend is compared against this.
  threshold_amount numeric(16, 2) not null check (threshold_amount > 0),
  currency       text not null default 'USD',
  -- TRUE => CCAO may DETACH billing from the project when threshold is crossed.
  auto_kill      boolean not null default false,
  -- Emails notified on breach / spike.
  alert_emails   text[] not null default '{}',
  alert_email_consent_at timestamptz,
  -- Sampling window for spend comparison: 'hourly' | 'daily' | 'monthly'
  period         text not null default 'hourly',
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.budgets
  add column if not exists provider text not null default 'gcp';

alter table public.budgets
  add column if not exists openai_account_id uuid;

alter table public.budgets
  add column if not exists aws_account_id uuid;

alter table public.budgets
  add column if not exists alert_email_consent_at timestamptz;

alter table public.budgets
  drop constraint if exists budgets_provider_check;

alter table public.budgets
  add constraint budgets_provider_check check (provider in ('gcp', 'aws', 'openai'));

alter table public.budgets enable row level security;

create policy "budgets_select_own" on public.budgets
  for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets
  for update using (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets
  for delete using (auth.uid() = user_id);

create or replace function public.enforce_budget_quotas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget_count integer;
  v_auto_kill_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('budget-quota:' || new.user_id::text, 0));

  select count(*) into v_budget_count
  from public.budgets
  where user_id = new.user_id and id <> new.id;

  if v_budget_count >= 20 then
    raise exception 'budget quota exceeded' using errcode = '23514';
  end if;

  if coalesce(array_length(new.alert_emails, 1), 0) > 5 then
    raise exception 'alert recipient quota exceeded' using errcode = '23514';
  end if;

  if new.active and new.auto_kill then
    select count(*) into v_auto_kill_count
    from public.budgets
    where user_id = new.user_id
      and active = true
      and auto_kill = true
      and id <> new.id;

    if v_auto_kill_count >= 5 then
      raise exception 'automatic action quota exceeded' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists budgets_enforce_quotas on public.budgets;
create trigger budgets_enforce_quotas
  before insert or update of user_id, active, auto_kill, alert_emails
  on public.budgets
  for each row execute function public.enforce_budget_quotas();

-- ============================================================
-- cost_logs  (historical hourly/daily/monthly spend)
-- ============================================================
create table if not exists public.cost_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  gcp_account_id uuid references public.gcp_accounts (id) on delete cascade,
  budget_id      uuid references public.budgets (id) on delete set null,
  amount         numeric(16, 6) not null default 0,
  currency       text not null default 'USD',
  -- 'hourly' | 'daily' | 'monthly' — matches budgets.period
  interval_type  text not null default 'hourly',
  sampled_at     timestamptz not null default now(),
  source         text not null default 'bigquery',
  created_at     timestamptz not null default now()
);

alter table public.cost_logs enable row level security;

create policy "cost_logs_select_own" on public.cost_logs
  for select using (auth.uid() = user_id);
-- Only the service (service_role) writes cost logs via the API.
create policy "cost_logs_insert_service" on public.cost_logs
  for insert with check (auth.role() = 'service_role' or auth.uid() = user_id);

create index if not exists cost_logs_sampled_at_idx
  on public.cost_logs (sampled_at desc);
create index if not exists cost_logs_account_time_idx
  on public.cost_logs (gcp_account_id, sampled_at desc, interval_type);

-- ============================================================
-- alert_logs  (budget breaches, spike alerts, billing kills)
-- ============================================================
create table if not exists public.alert_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  gcp_account_id uuid references public.gcp_accounts (id) on delete cascade,
  budget_id      uuid references public.budgets (id) on delete set null,
  -- 'budget_breach' | 'anomaly_spike' | 'billing_disabled' | 'billing_reenabled' | 'error'
  alert_type     text not null,
  severity       text not null default 'warning', -- 'info' | 'warning' | 'critical'
  message        text not null,
  details        jsonb not null default '{}'::jsonb,
  emailed_to     text[] not null default '{}',
  created_at     timestamptz not null default now()
);

alter table public.alert_logs enable row level security;

create policy "alert_logs_select_own" on public.alert_logs
  for select using (auth.uid() = user_id);
create policy "alert_logs_insert_service" on public.alert_logs
  for insert with check (auth.role() = 'service_role' or auth.uid() = user_id);

create index if not exists alert_logs_user_time_idx
  on public.alert_logs (user_id, created_at desc);
create index if not exists alert_logs_type_idx
  on public.alert_logs (alert_type);

-- ============================================================
-- helpers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists gcp_accounts_set_updated_at on public.gcp_accounts;
create trigger gcp_accounts_set_updated_at before update on public.gcp_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- ============================================================
-- SaaS entitlement helper (mirrored in migrations/20261010_subscription_billing.sql)
-- ============================================================
create or replace function public.is_user_entitled(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    return false;
  end if;

  if v_profile.subscription_status in ('active', 'trialing')
     and v_profile.subscription_current_period_end is not null
     and v_profile.subscription_current_period_end > now() then
    return true;
  end if;

  if v_profile.subscription_status in ('active', 'trialing')
     and v_profile.subscription_current_period_end is null
     and v_profile.trial_end > now() then
    return true;
  end if;

  if v_profile.trial_end > now()
     and v_profile.subscription_status in ('trialing', 'active') then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.is_user_entitled(uuid) from public, anon, authenticated;
grant execute on function public.is_user_entitled(uuid) to service_role;