-- REA-966 dress-rehearsal throwaway migration (from docs/demo-prd.md §4)
-- Run in the NEW throwaway Supabase project's SQL editor. NOT `supabase db push`.
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
