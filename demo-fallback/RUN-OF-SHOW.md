# Run of show — AI Conf 2025 live build

Read this on your phone backstage. ~15 minutes of stage time.

**Before you walk on, do these four things.** They take 90 seconds.

- [ ] `cd` to the repo, run `node demo-fallback/serve.mjs --reset`. Leave it running all show.
- [ ] Open three tabs, in this order: **1** live URL (or `localhost:54321`) · **2** `localhost:54321/db` · **3** the Paperclip board.
- [ ] Turn the wifi **off**, reload tab 1, register once. It must work. Turn wifi back on. That is your whole pre-flight.
- [ ] Pick an email you have **not** used in rehearsal. `thomas+aiconf1@realityflux.llc` — increment the number every run.

---

## Which path are you on?

Decide this in the green room, not on stage.

| | **Path A — live** | **Path B — local** |
| --- | --- | --- |
| Needs | Supabase keys **and** a claimed Vercel URL | nothing |
| Tab 1 is | the public URL | `http://localhost:54321` |
| Beat 10 shows | the Supabase dashboard | `localhost:54321/db` |
| One line you say | "that's a public URL, on your phone right now" | "this is running on this laptop, wifi off" |

**As of writing, Path B is the path.** Nobody has Supabase credentials, and the
only deployed URL is an anonymous Vercel preview that expires around 16:50 UTC.
See "What is actually true right now" at the bottom.

Everything below is written for Path B, with the Path A swap called out where
it differs. The steps are otherwise identical — that is the point.

---

## The show

**1. Cold open — 0:00 → 1:00**
Board on screen, empty.
> "I'm going to build and ship a conference registration site, from nothing, in the time it takes to explain what it is. I'm not going to write any code. Let's see how far we get."

**2. The spec — 1:00 → 2:30**
Open the PRD (AIC-8). Scroll it slowly. Don't read it out.
> "This is the only thing I wrote. A table, four sections, one form. Notice what it is — it's a spec, not instructions. I'm not telling anyone which file to open."

**3. Paste the kickoff — 2:30 → 3:30**
Paste the §11 block. **Do not edit it live.** Hit enter.
> "One paste. Now watch the board, not me."

**4. The board fills — 3:30 → 5:30**
Issues appear and get assigned. Let there be silence for a few seconds; the board moving is the demo.
> "Nobody assigned that. It read the spec, found four tracks that don't depend on each other, and staffed them. Scaffold, infra, components, deploy."

Point at two agents working at once.
> "Those two are running in parallel right now. That's the part that makes this thirty minutes instead of a day."

**5. Code appears — 5:30 → 7:30**
Open a diff or a file an agent just wrote.
> "This is the registration form. I want to show you one line."

Show the insert with no `.select()` chained.
> "The database denies anonymous reads — that's the security model. So if you ask for the row back after writing it, a *successful* write reports as an error. An engineer agent caught that and told the other one before either wrote a line. That's not autocomplete. That's two specialists talking."

**6. Infra — 7:30 → 9:00**
Show the SQL and the RLS policy.
> "One table. Anyone can insert, nobody can read. Which is what you want when the anon key ships in the browser — and it does, by design."

*Path A:* show the Supabase project. *Path B:* say — "the schema is written and reviewed; wiring it to a hosted project is a credential, not a code problem."

**7. Deploy — 9:00 → 10:00**
*Path A:* show the Vercel deploy going green, then read the URL out.
*Path B:* skip to 8. Don't apologise, don't explain. Just move.

**8. The live moment — 10:00 → 11:30**
Switch to tab 1. Full screen.
> "That's the site. Hero, agenda, speakers, register."

Scroll once, top to bottom. Slowly. Then hit **Register Now**.

**9. Register — 11:30 → 12:30**
Type the name and the fresh email. **Say the email out loud as you type it** — it makes the next beat land.
Click **Register**.
> "You're registered! See you September 6."

**10. The row — 12:30 → 13:30**
Switch to tab 2. The row is already there, highlighted.
> "Same row. In the database. It was written by a page that didn't exist when I walked on stage."

*This is the peak. Stop talking for two seconds and let them look at it.*

**11. Do it twice — 13:30 → 14:00**
Back to tab 1, reload, submit the **same email** again.
> "You're already registered. Nobody specified that error message — it's a unique constraint violation, code 23505, caught and turned into a sentence a human can read."

**12. What we left out — 14:00 → 15:00**
See the next section. Close on it.

---

## Beat 12 — "what we left out" (PRD §12)

Say it as confidence, not apology. The cuts are the point.

> "What you did *not* see: no confirmation email, no captcha, no waitlist. I cut all three, on purpose, and the reason is the interesting part."

> "The confirmation email needs a verified sending domain, a secret in a vault, a deployed edge function, and a cron job. Four external steps, and every one of them can stop dead on a login prompt. The captcha is the same shape — another deploy, another secret. Waitlist ranking is real database logic that would have looked like nothing from where you're sitting."

> "None of those are hard. They're *serial*. They're the things that turn thirty minutes into an afternoon, and none of them would have changed what you saw."

Then the turn — this is the actual close:

> "The production version of this site was built the same way, across thirty-odd issues over a few weeks. It has all of it. Same agents, same board, same loop — just more turns of it."

> "So: here's the core, built in front of you. And here's the issue trail that hardened it into production. That's the whole pitch. You didn't watch a demo of a toy. You watched the first thirty minutes of a real project."

**If someone asks "is it really doing that, or is it scripted?"** — best question you'll get. Take the empty submit, the malformed email, or ask *them* for an email address and register it live. All three are exercised and all three work.

---

## Failure modes, with the one line that recovers each

Say the recovery line out loud and keep moving. The audience forgives a fault; they don't forgive a founder going quiet.

| What happens | Say this | Then do this |
| --- | --- | --- |
| **Wifi dies** | "Good — this is the part I planned for." | Nothing. Path B never touched the network. |
| **Live URL is 404 / expired** | "That's an anonymous preview and it's timed out. Local it is." | Switch to tab 1 → `localhost:54321`. |
| **Page shows a yellow "not configured" banner** | "No database keys in the room — the local copy has its own." | Switch to `localhost:54321`. |
| **Form spins, then "Something went wrong"** | "Server's gone. Watch — same page, local database." | Switch to `localhost:54321`, submit again. |
| **"You're already registered" when you wanted success** | "Already in there from rehearsal — I'll use another." | Add `+2` to the address. Or `--reset` the server between shows. |
| **Row doesn't appear in tab 2** | *(don't announce it)* | Reload the tab. It polls every second; a reload is instant. |
| **Local server not running / tab 2 shows an error** | "One second." | New terminal: `node demo-fallback/serve.mjs`. ~1 second to boot. |
| **Port 54321 already in use** | *(silent)* | `FALLBACK_PORT=54999 node demo-fallback/serve.mjs`, use that port. |
| **Node itself won't run** | "Let me open the local copy." | Double-click `demo-fallback/offline.html`. Full form flow, no server. No tab-2 beat. |
| **Laptop won't cooperate at all** | "I recorded this earlier — here's the flow, then I'll take questions." | Open `demo-fallback/recording/index.html`. Space bar advances. |
| **An agent stalls mid-build** | "That one's waiting on a credential I didn't give it. The others kept going." | Point at a *different* agent still working. True, and it's a better story than the stall. |
| **Board is slow to update** | "It's working, it's just not narrating." | Keep talking over it. Never wait on a refresh in silence. |
| **Cold start — page takes seconds** | "First load, it's waking up." | Local never cold-starts; if you're on Path A and it's slow, load the URL once in the green room. |

---

## What is actually true right now

Stated plainly, because you should not find this out on stage.

**Works, rehearsed, no credentials needed:**
- The whole page — hero, agenda, speakers, form. PRD §5 content, verbatim.
- Registering, and the success state.
- The row appearing in a table view, one second later.
- Duplicate email → "You're already registered." Case-insensitive, so `THOMAS@…` still catches.
- Anonymous read denied, 401 — the same RLS behaviour production has.
- All of it with the wifi off.

12/12 checks passed driving this in a real browser end to end. Full flow, cold, in about 4 seconds.

**Does not work, and will not without the founder:**
- A **public URL** anyone in the room can open on their phone. Needs a Vercel claim or token.
- A **real Supabase row** in the real dashboard. Needs a project URL + anon key.
- Beat 7 (deploy) and the dashboard half of beat 10.

**The one thing that makes Path A possible:** paste a Supabase project URL and anon key into AIC-3, and claim the Vercel deployment. Then `./go-live.sh <url> <anon-key>` does the rest in one command. If those land more than ten minutes before you walk on, take Path A. Under ten minutes, take Path B anyway — a rehearsed local run beats an unrehearsed live one, and the audience cannot tell.

**Not rehearsed:** the agents building live on stage (beats 3–7). That is your board, on the day, and it depends on the room's network and how the fleet behaves. Beats 8–12 are the ones I could make deterministic, and they are.
