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
