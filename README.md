# aiconf-demo

Conference registration site — Next.js 14 static export + Tailwind + Supabase.

Built live from `docs/demo-prd.md` as the Friday AI Conf demo. **Throwaway / free tier.**
This is not the production `aiconf` site.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Build | Static export (`output: 'export'`) |
| Styling | Tailwind CSS |
| Data | `@supabase/supabase-js` browser client |
| Hosting | Vercel, auto-deploy on push to `main` |

## Environment variables

Set both in the Vercel project **before the first deploy** — a static export inlines
`NEXT_PUBLIC_*` at build time, so changing them later requires a redeploy, not just a restart.

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |

## Database

One table, applied via the Supabase SQL editor (not `supabase db push`):

```sql
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
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in both values
npm run dev
```

## Build

```bash
npm run build   # emits ./out
```

The build succeeds without Supabase env vars — the client is constructed lazily on first
form submit, so a missing key surfaces as a runtime error instead of breaking CI.
