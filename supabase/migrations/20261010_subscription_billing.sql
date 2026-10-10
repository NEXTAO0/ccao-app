-- ============================================================
-- CCAO SaaS billing: trial + Stripe subscription entitlements
-- Apply in Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Extend profiles with trial + Stripe subscription state.
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text not null default 'trialing',
  add column if not exists subscription_price_id text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists trial_start timestamptz not null default now(),
  add column if not exists trial_end timestamptz not null default (now() + interval '30 days'),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill existing rows that predate the SaaS cutover:
-- 30-day trial anchored at account creation.
update public.profiles
set trial_start = created_at,
    trial_end = created_at + interval '30 days'
where trial_start is null or trial_end is null;

-- Constrain subscription_status to known Stripe + local states.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_subscription_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_subscription_status_check
      check (subscription_status in (
        'trialing', 'active', 'past_due', 'canceled',
        'incomplete', 'incomplete_expired', 'unpaid', 'paused', 'expired'
      ));
  end if;
end $$;

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);
create index if not exists profiles_subscription_status_idx
  on public.profiles (subscription_status);
create index if not exists profiles_trial_end_idx
  on public.profiles (trial_end);

-- Users can read their own entitlement fields for UI (trial countdown,
-- subscribe CTA). Writes to billing columns are service_role only via
-- RLS: no update policy grants billing-column writes to authenticated.
-- Existing profiles_select_own / profiles_update_own / profiles_insert_own
-- remain; webhook uses service_role which bypasses RLS.

-- New users start with a 30-day free trial wall.
create or replace function public.handle_new_user()
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

-- Helper: single source of truth for entitlement checks.
-- Entitled when subscription is active/trialing with a future period end,
-- or when the 30-day DB trial is still valid.
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

  -- DB trial fallback (covers Stripe trialing without period end yet).
  if v_profile.trial_end > now()
     and v_profile.subscription_status in ('trialing', 'active') then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.is_user_entitled(uuid) from public, anon, authenticated;
grant execute on function public.is_user_entitled(uuid) to service_role;
