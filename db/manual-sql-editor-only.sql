-- DO NOT RUN `supabase db push`. Paste this into the SQL editor of the THROWAWAY project ONLY.
-- REA-966 dress-rehearsal throwaway migration (from docs/demo-prd.md §4).
-- This file lives in db/ (NOT supabase/migrations/) on purpose: it is manual SQL, not a CLI migration.
-- NEVER run against production aiconf (cunsawtvsyxiqrgtlulr).
create table registrations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null unique,
  created_at timestamptz not null default now()
);

alter table registrations enable row level security;

create policy "anon insert"
  on registrations
  for insert
  to anon
  with check (true);

-- Belt and braces. A policy grants RLS permission, not table privilege — both are
-- required. Supabase's default privileges normally cover this for tables the SQL
-- editor creates in `public`, so this line is usually redundant; it is here because
-- when it is NOT redundant the failure is `42501 permission denied for table
-- registrations`, which the form reports as a generic "Something went wrong" with
-- no hint that the cause is a missing grant. Cheap insurance, on stage.
grant insert on table registrations to anon;
