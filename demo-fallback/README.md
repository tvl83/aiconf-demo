# demo-fallback

Insurance for the stage. Owned by the Demo Producer (AIC-5).

**Read [RUN-OF-SHOW.md](RUN-OF-SHOW.md) first** — that is the deliverable. This
file is just how the kit works.

## One command

```bash
node demo-fallback/serve.mjs --reset
```

No npm install, no dependencies, no internet. Node only. Then:

| | |
| --- | --- |
| `http://localhost:54321/` | the registration page |
| `http://localhost:54321/db` | the rows, table-editor shaped, polls every second |
| `http://localhost:54321/recording` | the recorded flow, if the laptop gives up entirely |

`--reset` empties the table. Do that before each run so the founder's email is
not already taken. `FALLBACK_PORT=54999` moves it if 54321 is occupied.

## Three layers, worst case down

1. **`serve.mjs`** — page plus a visible database. The full demo, wifi off. This
   is the primary path until credentials exist.
2. **`offline.html`** — open it directly off disk, no server, no Node. Whole form
   flow works; rows live in memory and reset on reload, so there is no
   database beat.
3. **`recording/`** — `index.html` steps through eight captured frames with the
   line to say under each; `demo.gif` is the same flow as a looping image.
   Captured from a real browser on a run where all 12 checks passed.

## Why there is a PostgREST stub in here

`serve.mjs` also answers `POST /rest/v1/<table>` the way PostgREST does. So the
**real** Next app can run fully offline against it:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-fallback-not-a-real-key \
npm run dev
```

That exercises the actual `@supabase/supabase-js` code path — real insert, real
`23505` on a duplicate, real 401 on a read — with no Supabase project in
existence. Two caveats: `NEXT_PUBLIC_*` is inlined at build time, so this must
be set for the `dev`/`build` process itself, not added afterwards; and the app
is mid-rebuild against the PRD, so prefer layer 1 until it settles.

The stub denies anonymous `SELECT` with a 401 on purpose. The production table
has no select policy, and a fallback that quietly allowed reads would be
demonstrating something the real thing does not do.

## Content

`offline.html` is PRD §5 verbatim — event name, tagline, date, all five agenda
rows, all three speakers, both form fields, and the three outcome messages. It
is a standalone file rather than a copy of the app because the app was being
rewritten against the PRD while this was built, and the fallback must not break
when the app changes. If PRD §5 copy changes, this file needs the same edit.

Styling approximates PRD §7 in plain CSS — Tailwind needs a build step, and
layer 2 has to open with nothing installed. Sizes are `clamp()` off viewport
width so it reads from the back of a room.

## Re-running the rehearsal

The 12-check browser rehearsal that produced `recording/*.png` lives in the
Demo Producer's scratch, not the repo. To redo it after a content change:
start the server, drive `localhost:54321` with any browser automation, assert
the beats listed in RUN-OF-SHOW, and re-capture. Or just step the flow by hand —
it takes about a minute and the failure-mode table tells you what to check.
