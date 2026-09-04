-- AIC-3 / PRD (AIC-8) §4 — the registrations table.
--
-- Paste into the NEW aiconf-demo project's SQL Editor and Run.
-- Do NOT run this against the production project cunsawtvsyxiqrgtlulr.
-- Do NOT use `supabase db push` — the PRD says SQL Editor.
--
-- This block is the PRD's DDL VERBATIM. It is not idempotent (no `if not
-- exists`) and that is deliberate: running it twice errors loudly rather than
-- silently diverging from the spec.

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

-- ---------------------------------------------------------------------------
-- Everything below is commentary. Nothing below runs.
-- ---------------------------------------------------------------------------
--
-- Why this is safe on a public page:
--   The anon key ships in the browser bundle, so treat it as public. Anyone who
--   loads the page can call the API with it. RLS is the actual boundary. The
--   policy above grants INSERT only; there is deliberately NO select, update,
--   or delete policy. Under RLS, anything without a matching policy is denied.
--   The ABSENCE is the security control -- do not "helpfully" add a read policy.
--
-- Two behaviours of the verbatim DDL worth knowing before stage:
--
--   1. A denied anonymous SELECT returns HTTP 200 with an empty array `[]`,
--      not a 401. No rows leak -- but the signal is quiet. Supabase grants the
--      anon role broad table privileges by default and leans on RLS alone.
--      If you want a denied read to fail loudly (and to stay protected even if
--      RLS is ever toggled off by accident), add:
--
--        revoke all on registrations from anon, authenticated;
--        grant insert on registrations to anon;
--
--      That is a deviation from the PRD, so it is NOT applied here. Ask the
--      founder first. supabase/verify.mjs asserts correctly either way.
--
--   2. `email text unique` is case-SENSITIVE. "Thomas@x.com" and
--      "thomas@x.com" are two different registrations and both will be
--      accepted. The on-stage duplicate demo retypes the same string, so 23505
--      fires as intended. To close the case gap without touching the schema,
--      lowercase the email in the client before insert.
--
-- The founder's on-stage view -- paste into the SQL Editor when the row lands.
-- Runs as table owner, so RLS does not hide anything:
--
--   select name, email, created_at
--   from registrations
--   order by created_at desc;
