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

grant insert on table registrations to anon;
```

The insert is fire-and-forget (`.insert()` with no `.select()`), so supabase-js sends
`Prefer: return=minimal` and the insert-only policy is sufficient — there is deliberately
no `select` policy. **A successful registration is therefore not readable from the app.**
Confirm writes in the Supabase table editor, not in the browser.

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

## Verify a deploy actually got the keys

Because the build is green either way, **a ✅ Vercel deploy is not evidence the site works.**
An unconfigured build fails only on form submit. Check the shipped bundle instead — this
reads the page's chunk out of the HTML and looks for a baked Supabase URL:

```bash
SITE=https://your-project.vercel.app
CHUNK=$(curl -s "$SITE/" | grep -oE '/_next/static/chunks/app/page-[a-z0-9]+\.js' | head -1)
curl -s "$SITE$CHUNK" | grep -oE 'https://[a-z0-9]+\.supabase\.co' | head -1
```

A URL means the keys were present at build time. **No output means they were not** — set
both vars and trigger a *rebuild*; a rollback or re-alias reuses the old bundle and will
not pick them up.

Two distinct on-page failures, so you can tell them apart without the console:

| Message under the form | Cause |
|---|---|
| "This build is missing its Supabase keys…" | env vars absent at build time — rebuild |
| "Something went wrong. Please try again." | insert rejected — table missing, RLS, or grant |
