# aiconf-demo — AI Conf 2025 registration page

One static page. A visitor reads the agenda and speakers, fills in name + email,
and the row lands in Supabase. Built to the PRD in AIC-8 and the build plan at
AIC-8 → plan.

**Production guardrail:** nothing here touches the live `aiconf` repo, the
Supabase project `cunsawtvsyxiqrgtlulr`, or its Vercel project.

## Stack

Next.js 16.3.4 (App Router, TypeScript) · Tailwind v4 · `@supabase/supabase-js`
· `output: 'export'` static export.

Tailwind v4 has no config file — it is configured by `@import "tailwindcss"` in
`app/globals.css` plus the PostCSS plugin. There is deliberately no
`tailwind.config.ts`; the PRD §6 file listing is stale on that point.

## Layout

```
app/layout.tsx              dark theme, scroll-smooth (drives the hero anchor)
app/page.tsx                Hero + Agenda + Speakers + RegistrationForm
app/globals.css             @import "tailwindcss"
components/Hero.tsx         "Register Now" -> #register
components/Agenda.tsx
components/Speakers.tsx     initials avatars, no images
components/RegistrationForm.tsx   'use client' — the only interactive piece
config/agenda.ts
config/speakers.ts
lib/supabase.ts             lazy browser client, reads NEXT_PUBLIC_* env vars
lib/registration-outcome.ts the three outcomes and their exact strings
supabase/migrations/        DDL + RLS (owned by the Supabase Engineer, AIC-3)
supabase/verify.mjs         checks a real project against the expected policy
test/registration-contract.test.mjs   drives the insert against a fake PostgREST
go-live.sh                  paste credentials -> verified build -> deploy (AIC-9)
```

## Run it

```
npm install
cp .env.local.example .env.local     # fill in from Supabase Settings > API
npm run dev
```

Without `.env.local` the page still builds and renders; the form shows a
not-configured banner instead of failing silently.

## Verify it

```
npm test          # the three outcome branches, no credentials needed
npm run build     # TypeScript + static export into out/
npm run test:e2e  # drives the exported page in a real browser (see below)
```

`npm test` drives the exact insert the form performs against a fake PostgREST
and asserts the three outcomes and their locked strings.

`npm run test:e2e` builds against a local stand-in for Supabase and then clicks
through the real rendered page in Chromium: success, duplicate, unreachable API,
the empty-submit field errors, the hero CTA behaviour, and that the form sits
fully inside a 1920×1080 viewport. Screenshots land in `.e2e-shots/`. It skips
cleanly if Playwright or Chromium is not installed.

## Two things that will bite on stage

**`NEXT_PUBLIC_*` is inlined at build time, not read at runtime.** The env vars
must be set *before* the build that gets deployed. Changing them in the Vercel
dashboard afterwards does nothing until you redeploy.

**The client cannot pre-check for a duplicate email.** The RLS policy grants
`anon` INSERT only, with no SELECT policy, so `registrations` is write-only from
the browser. A repeat registration is identified from the insert error code
(`23505`, Postgres unique_violation), and the insert deliberately omits
`.select()` — asking for the row back would turn every success into a permission
error.

Because the column's `unique` constraint is case-sensitive, the client
lowercases the email before inserting. Without that, `Jane@x.com` and
`jane@x.com` are two registrations.

## Not built, on purpose

Confirmation email, captcha, waitlist, admin export, moderation, service worker,
and the `/details` `/ask` `/admin` `/moderate` routes — PRD §8. These are
presenter talking points about what the production version added.
