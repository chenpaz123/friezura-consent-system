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
-- The client check-in flow and the admin dashboard both call Supabase with
-- the PUBLIC anon key (there is no end-user auth system in this MVP — the
-- "auth" boundary is simply "you're on the salon's Wi-Fi / scanned the QR
-- code" for clients, and the PIN screen for admins leaving Manual Entry
-- mode). The policies below are intentionally permissive so both flows work
-- out of the box. Before taking this to production behind real staff
-- accounts, tighten these to check auth.uid() / a staff role claim instead
-- of "anon can do anything".
-- ----------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.dogs enable row level security;
alter table public.consents enable row level security;




-- ----------------------------------------------------------------------------
-- Realtime: broadcast INSERTs on consents so the admin Live Queue updates
-- instantly via Supabase Realtime (Postgres CDC over websockets).
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Secure Realtime Feed
-- We removed open select policies, so anon users can no longer listen to
-- `consents` via Realtime (it respects RLS). Instead, we broadcast just the
-- event and ID via a public `admin_events` table. The client sees the ping
-- and fetches the full row securely via a Server Action.
-- ----------------------------------------------------------------------------
create table if not exists public.admin_events (
  id           uuid primary key default gen_random_uuid(),
  event_type   varchar(20) not null,
  consent_id   uuid not null,
  created_at   timestamptz not null default now()
);

alter table public.admin_events enable row level security;
drop policy if exists "admin_events_select_all" on public.admin_events;
create policy "admin_events_select_all" on public.admin_events for select using (true);

create or replace function public.log_admin_event()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.admin_events (event_type, consent_id, created_at)
    values ('INSERT', new.id, new.created_at);
  elsif (TG_OP = 'DELETE') then
    insert into public.admin_events (event_type, consent_id, created_at)
    -- We can't use old.created_at for the event's created_at reliably, so just use now()
    values ('DELETE', old.id, now());
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists consents_log_event on public.consents;
create trigger consents_log_event
  after insert or delete on public.consents
  for each row execute function public.log_admin_event();

alter publication supabase_realtime add table public.admin_events;

-- ----------------------------------------------------------------------------
-- Restore Insert Policies
-- The client form still submits directly to Supabase via the anon key.
-- ----------------------------------------------------------------------------
drop policy if exists "customers_insert_all" on public.customers;
create policy "customers_insert_all" on public.customers for insert with check (true);
drop policy if exists "dogs_insert_all" on public.dogs;
create policy "dogs_insert_all" on public.dogs for insert with check (true);
drop policy if exists "consents_insert_all" on public.consents;
create policy "consents_insert_all" on public.consents for insert with check (true);
