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
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Keeps `profiles` in sync with new auth users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
  )
  on conflict (id) do nothing;
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
  name           text not null default 'Default budget',
  -- Threshold in the given currency; spend is compared against this.
  threshold_amount numeric(16, 2) not null check (threshold_amount > 0),
  currency       text not null default 'USD',
  -- TRUE => CCAO may DETACH billing from the project when threshold is crossed.
  auto_kill      boolean not null default false,
  -- Emails notified on breach / spike.
  alert_emails   text[] not null default '{}',
  -- Sampling window for spend comparison: 'hourly' | 'daily' | 'monthly'
  period         text not null default 'hourly',
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.budgets
  add column if not exists provider text not null default 'gcp';

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