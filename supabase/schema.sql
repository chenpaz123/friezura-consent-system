-- ============================================================================
-- Friezura Consent System — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh
-- project. Safe to re-run: guards with IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  phone_number varchar(20) primary key,
  full_name    varchar(120) not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.customers is 'One row per unique client phone number.';

-- ----------------------------------------------------------------------------
-- dogs
-- ----------------------------------------------------------------------------
create table if not exists public.dogs (
  id             uuid primary key default gen_random_uuid(),
  customer_phone varchar(20) not null references public.customers(phone_number) on delete cascade,
  name           varchar(80) not null,
  created_at     timestamptz not null default now()
);

create index if not exists dogs_customer_phone_idx on public.dogs(customer_phone);

-- ----------------------------------------------------------------------------
-- consents
-- ----------------------------------------------------------------------------
create table if not exists public.consents (
  id                  uuid primary key default gen_random_uuid(),
  customer_phone      varchar(20) not null references public.customers(phone_number) on delete cascade,
  dog_id              uuid not null references public.dogs(id) on delete cascade,
  has_medical_issue   boolean not null default false,
  medical_details     text,
  has_behavioral_issue boolean not null default false,
  behavioral_details  text,
  agreed_to_terms     boolean not null default false,
  signature_data      text not null, -- base64 PNG data URL from the <canvas> signature pad
  created_at          timestamptz not null default now()
);

create index if not exists consents_customer_phone_idx on public.consents(customer_phone);
create index if not exists consents_dog_id_idx on public.consents(dog_id);
create index if not exists consents_created_at_idx on public.consents(created_at desc);

comment on table public.consents is 'One row per signed grooming consent/check-in.';

-- ----------------------------------------------------------------------------
-- keep customers.updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- The public anon key is used by the client check-in flow (insert-only —
-- customers and dogs are created by anyone who scans the QR code, which is
-- the intended "auth" boundary for that flow) and, for Realtime only, by the
-- admin dashboard's browser tab. anon gets INSERT and nothing else: no
-- SELECT, UPDATE, or DELETE on any of these three tables, so the anon key
-- extractable from the client bundle can never be used to read or modify
-- existing customer/dog/consent data directly (e.g. via Supabase's REST
-- API), no matter what UI-level PIN gate does or doesn't exist.
--
-- Everything the admin dashboard reads goes through Server Actions
-- (src/app/actions/adminData.ts) using the service_role key, which bypasses
-- RLS entirely — those actions independently re-verify the caller's PIN
-- against ADMIN_PIN/SUPER_ADMIN_PIN server-side before touching Supabase, so
-- there is no gap opened by removing anon's SELECT here.
-- ----------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.dogs enable row level security;
alter table public.consents enable row level security;

drop policy if exists "customers_select_all" on public.customers;
drop policy if exists "customers_insert_all" on public.customers;
create policy "customers_insert_all" on public.customers for insert with check (true);
drop policy if exists "customers_update_all" on public.customers;

drop policy if exists "dogs_select_all" on public.dogs;
drop policy if exists "dogs_insert_all" on public.dogs;
create policy "dogs_insert_all" on public.dogs for insert with check (true);

drop policy if exists "consents_select_all" on public.consents;
drop policy if exists "consents_insert_all" on public.consents;
create policy "consents_insert_all" on public.consents for insert with check (true);

-- ----------------------------------------------------------------------------
-- admin_events: a ping-only table the admin Live Queue subscribes to over
-- Realtime instead of subscribing to `consents` directly.
--
-- Supabase Realtime's Postgres Changes feature enforces each table's SELECT
-- RLS policy for the connecting role before delivering a change — so once
-- anon loses SELECT on `consents` above, an anon-key Realtime subscription
-- to `consents` would simply stop delivering events. This table exists so
-- the Live Queue can keep getting instant "something changed" pings without
-- anon ever being able to select real customer data: it carries nothing but
-- an event type, the affected consent's id, and a timestamp. On each ping,
-- the client fetches the actual row via the PIN-checked `getConsentById`
-- Server Action, same as any other admin read.
-- ----------------------------------------------------------------------------
create table if not exists public.admin_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null check (event_type in ('insert', 'delete')),
  consent_id  uuid not null,
  created_at  timestamptz not null default now()
);

alter table public.admin_events enable row level security;

-- Safe to leave world-readable: the row shape above carries zero PII, so
-- there's nothing here for the RLS lockdown above to protect.
drop policy if exists "admin_events_select_all" on public.admin_events;
create policy "admin_events_select_all" on public.admin_events for select using (true);
-- Deliberately no insert/update/delete policy for anon — the only writer is
-- the security definer trigger function below, which runs as its owner
-- (the superuser role used by the SQL editor) and so bypasses RLS entirely.

create or replace function public.log_admin_event()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.admin_events (event_type, consent_id) values ('insert', new.id);
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.admin_events (event_type, consent_id) values ('delete', old.id);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists consents_log_admin_event on public.consents;
create trigger consents_log_admin_event
  after insert or delete on public.consents
  for each row execute function public.log_admin_event();

-- ----------------------------------------------------------------------------
-- Realtime: publish admin_events (the Live Queue's actual subscription
-- target) and keep consents published too, in case a future service-role /
-- authenticated Realtime connection ever wants it directly. `alter
-- publication ... add table` errors if the table is already a member, so
-- both adds are guarded to keep this file safe to re-run.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'consents'
  ) then
    alter publication supabase_realtime add table public.consents;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_events'
  ) then
    alter publication supabase_realtime add table public.admin_events;
  end if;
end $$;
