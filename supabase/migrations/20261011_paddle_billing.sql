-- ============================================================
-- CCAO SaaS billing: migrate Stripe identifiers to Paddle Billing
-- Apply in Supabase Dashboard → SQL Editor → Run
-- Paddle is the merchant of record; webhooks keep profiles in sync.
-- ============================================================

-- Add Paddle identifier columns.
alter table public.profiles
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text;

-- Backfill from legacy Stripe columns when present (one-off cutover).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
    and column_name = 'stripe_customer_id'
  ) then
    update public.profiles
    set paddle_customer_id = stripe_customer_id
    where paddle_customer_id is null and stripe_customer_id is not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
    and column_name = 'stripe_subscription_id'
  ) then
    update public.profiles
    set paddle_subscription_id = stripe_subscription_id
    where paddle_subscription_id is null and stripe_subscription_id is not null;
  end if;
end $$;

create index if not exists profiles_paddle_customer_id_idx
  on public.profiles (paddle_customer_id);

-- Drop legacy Stripe columns and index (Stripe references removed).
drop index if exists profiles_stripe_customer_id_idx;
alter table public.profiles
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id;

-- Users can read their own entitlement fields for UI (trial countdown,
-- pricing CTA). Writes to billing columns are service_role only via
-- RLS: no update policy grants billing-column writes to authenticated.
-- Existing profiles_select_own / profiles_update_own / profiles_insert_own
-- remain; the Paddle webhook uses service_role which bypasses RLS.

-- Helper comment: entitlement logic is unchanged (trial + active statuses).
-- DB trial fallback covers Paddle trialing without period end yet.
