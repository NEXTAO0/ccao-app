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
    where user_id = new.user_id and active = true and auto_kill = true and id <> new.id;
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;