create table if not exists public.legal_consents (
  user_id         uuid not null references auth.users (id) on delete cascade,
  terms_version   text not null,
  privacy_version text not null,
  accepted_at     timestamptz not null default now(),
  primary key (user_id, terms_version, privacy_version)
);

alter table public.legal_consents enable row level security;