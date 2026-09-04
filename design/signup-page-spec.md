# Sign-up page — design spec (AIC-7)

For the Full-Stack Engineer (AIC-4). Implement directly from these values.
Source of truth for content: the PRD on AIC-8 + the Build Plan. **Strings marked
`LOCKED` are verbatim from the PRD — style them, do not reword them.**

Design target: 1920×1080 projector, washed-out colours, viewer 30 ft back, room
lights up.

---

## 0 · The three things that matter

1. Hero **and** the form are both in the first viewport at ≥1024px. No scrolling
   to reach the form.
2. One visually dominant CTA: the solid black **Register** button. Everything
   else is outlined or plain text.
3. Nothing under 18px. Nothing below `font-weight: 500`. Nothing below 7:1
   contrast. A projector in a lit room eats 30–50% of your contrast — the page
   has to look almost cartoonishly heavy on a laptop to read correctly on a wall.

---

## 1 · Tokens

Paste into `app/globals.css` under `:root`. Do **not** create a new CSS file —
PRD §7 says utilities/one stylesheet only.

```css
:root {
  /* Light theme — primary. See §7 for the dark swap. */
  --paper:   #FFFFFF;
  --ink:     #0A0A0A;   /* 19.8:1 on paper — headlines, body, borders */
  --ink-2:   #33333B;   /* 12.5:1 — subhead, secondary. Never go lighter. */
  --accent:  #1A38D6;   /*  8.1:1 — eyebrow, focus ring, link */
  --error:   #B00018;   /*  7.3:1 */
  --success: #0A5C2D;   /*  8.1:1 both ways (white text sits on it) */
  --line:    #0A0A0A;   /* borders are ink, never grey — grey vanishes */

  --r:       10px;      /* radius: inputs, button */
  --r-card:  20px;      /* radius: form card */
}
```

Every ratio above is measured, not estimated. **7:1 is the floor** — that is
WCAG AAA, one step past normal web practice, chosen because projector washout
costs roughly one contrast tier.

Hard rules:
- No grey lighter than `#33333B` anywhere.
- No hairline borders. `3px` minimum, `4px` on the card.
- No blurred shadows — they turn to mud. Use a hard offset shadow (§4).
- Colour is never the only signal: the error line is red **and** bold **and**
  prefixed `✕`.

### Tailwind equivalents

If you go Tailwind rather than the existing plain CSS, these map 1:1:

| Token | Tailwind |
| --- | --- |
| `--paper` | `bg-white` |
| `--ink` | `text-[#0A0A0A]` / `bg-[#0A0A0A]` / `border-[#0A0A0A]` |
| `--ink-2` | `text-[#33333B]` |
| `--accent` | `text-[#1A38D6]` / `outline-[#1A38D6]` |
| `--error` | `text-[#B00018]` |
| `--success` | `bg-[#0A5C2D]` |
| card | `rounded-[20px] border-4 border-[#0A0A0A] shadow-[12px_12px_0_#0A0A0A]` |
| input | `h-[clamp(56px,5.2vh,76px)] rounded-[10px] border-[3px] border-[#0A0A0A]` |

---

## 2 · Type scale

All sizes are `clamp(floor, vw, ceiling)` — the ceiling is what the projector
gets, the floor keeps a laptop and a phone sane.

| Element | `font-size` | Weight | Other |
| --- | --- | --- | --- |
| Eyebrow | `clamp(18px, 1.25vw, 24px)` | 700 | uppercase, `letter-spacing: .18em`, `--accent` |
| **H1** | `clamp(44px, 5.5vw, 106px)` | 800 | `line-height: .92`, `letter-spacing: -.03em`, `max-width: 12ch` |
| Subhead | `clamp(20px, 2.1vw, 40px)` | 500 | `line-height: 1.25`, `--ink-2`, `max-width: 20ch` |
| Hero CTA | `clamp(20px, 1.8vw, 34px)` | 700 | — |
| Card heading | `clamp(24px, 2.2vw, 42px)` | 800 | — |
| Field label | `clamp(16px, 1.15vw, 22px)` | 700 | uppercase, `letter-spacing: .12em` |
| Input text | `clamp(20px, 1.9vw, 36px)` | 500 | — |
| **Register button** | `clamp(22px, 2vw, 38px)` | 800 | — |
| Error / status | `clamp(18px, 1.6vw, 30px)` | 700 | — |
| Section heading | `clamp(32px, 3.2vw, 60px)` | 800 | Agenda / Speakers |
| Agenda time | `clamp(18px, 1.7vw, 32px)` | 700 | `font-variant-numeric: tabular-nums` |
| Agenda session | `clamp(20px, 1.9vw, 36px)` | 500 | — |
| Speaker name | `clamp(20px, 1.8vw, 34px)` | 800 | — |
| Speaker title / line | `clamp(16px, 1.3vw, 24px)` | 500 | `--ink-2` |

> **Change from what is currently deployed:** H1 is `5.5vw`, not `9vw`. At 9vw
> the headline is 173px on a 1080p projector and pushes the form off the fold.
> 5.5vw (≈106px) still reads from the back of the room and buys the space the
> form needs.

**Spacing scale — 8px base.** Use only: `8 · 16 · 24 · 40 · 64 · 96 · 128`.

---

## 3 · Layout — the fold

```
┌─────────────────────────────────────── 100svh, min-height 640px ──┐
│                                                                    │
│   AI CONF 2025 (eyebrow)          ┌────────────────────────────┐  │
│                                    │  Save your seat.           │  │
│   The future of AI,                │                            │  │
│   live in                          │  NAME                      │  │
│   San Francisco                    │  [ Your name            ]  │  │
│                       (H1)         │                            │  │
│                                    │  EMAIL                     │  │
│   September 6, 2025 ·              │  [ you@example.com      ]  │  │
│   San Francisco     (subhead)      │                            │  │
│                                    │  [      Register       ]   │  │
│   [ Register Now ]  (outlined)     │  (error line, reserved)    │  │
│                                    └────────────────────────────┘  │
│                                              id="register"         │
└────────────────────────────────────────────────────────────────────┘
              ↓ below the fold: Agenda, then Speakers
```

```css
.fold {
  min-height: 100svh;
  min-height: 640px;              /* fallback floor */
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  align-items: center;
  gap: clamp(48px, 5vw, 96px);
  padding: clamp(40px, 5vh, 96px) clamp(24px, 5vw, 96px);
  max-width: 1600px;
  margin-inline: auto;
}

@media (max-width: 1023px) {
  .fold { grid-template-columns: 1fr; gap: 40px; min-height: auto; }
}
```

- Hero stack gap: `24px` between eyebrow → H1 → subhead, `40px` before the CTA.
- **Hero CTA behaviour.** PRD §5a says "Register Now" smooth-scrolls to
  `#register`. At ≥1024px the form is already on screen, so scrolling looks
  broken — instead **focus the Name input** (`document.getElementById('name').focus()`)
  and keep the `href="#register"` fallback. Below 1024px, smooth-scroll as
  specified. Wrap the scroll in `prefers-reduced-motion` and jump instantly if set.
- Below the fold, content max-width `1200px`, centred, section padding
  `clamp(64px, 8vh, 128px)` block.

---

## 4 · The form card

```css
.card {
  width: min(100%, 544px);
  background: var(--paper);
  border: 4px solid var(--ink);
  border-radius: var(--r-card);
  padding: clamp(28px, 3vw, 56px);
  box-shadow: 12px 12px 0 var(--ink);   /* hard offset, zero blur */
  display: grid;
  gap: 24px;
}
```

Fields — **exactly the two the PRD specifies, in this order. Do not add, remove,
or reorder.**

| # | Label | `id` / `name` | Type | Required | Placeholder |
| --- | --- | --- | --- | --- | --- |
| 1 | `NAME` | `name` | `text` | yes | `Your name` `LOCKED` |
| 2 | `EMAIL` | `email` | `email` | yes | `you@example.com` `LOCKED` |

Label sits **above** its input (`8px` gap) — never a placeholder-only field;
placeholders are grey and grey disappears on a projector.

```css
input {
  width: 100%;
  height: clamp(56px, 5.2vh, 76px);
  padding-inline: 20px;
  font-size: clamp(20px, 1.9vw, 36px);
  border: 3px solid var(--line);
  border-radius: var(--r);
  background: var(--paper);
  color: var(--ink);
}
input::placeholder { color: #6B6B75; }         /* 5.3:1 — placeholders only */
input[aria-invalid='true'] { border-color: var(--error); border-width: 4px; }

input:focus-visible, button:focus-visible {
  outline: 4px solid var(--accent);
  outline-offset: 3px;
}

.btn-register {
  width: 100%;
  height: clamp(64px, 6vh, 88px);
  font-size: clamp(22px, 2vw, 38px);
  font-weight: 800;
  background: var(--ink);
  color: var(--paper);
  border: 3px solid var(--ink);
  border-radius: var(--r);
  cursor: pointer;
}
.btn-register:hover  { background: var(--accent); border-color: var(--accent); }
.btn-register:disabled { opacity: .5; cursor: progress; }

/* Hero CTA — deliberately secondary so there is one dominant CTA. */
.btn-hero {
  background: transparent;
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: var(--r);
  padding: 16px 32px;
  font-size: clamp(20px, 1.8vw, 34px);
  font-weight: 700;
}
```

Keep `noValidate` — you were right that the native bubble is unreadable at 30 ft.

---

## 5 · States

Reserve the error row (`min-height: 1.5em`) so nothing jumps mid-demo.

| State | Where | Rendering |
| --- | --- | --- |
| Idle | — | Button reads `Register` `LOCKED` |
| Submitting | Button | Label → `Registering…`, `disabled`, `opacity .5` |
| Empty / bad field | Under that input | `--error`, 700, prefixed `✕ `, and `aria-invalid="true"` + `aria-describedby` on the input |
| **Duplicate email** | Under the button | `✕ You're already registered.` `LOCKED` in `--error` |
| **Other error** | Under the button | `✕ Something went wrong. Please try again.` `LOCKED` in `--error` |
| **Success** | Replaces the card's contents | see below |

Form-level error row: `role="alert"`. It must announce, not just appear.

### Success state

PRD §5d: replace the form with `You're registered! See you September 6.`
`LOCKED`. Rendered as two lines — **same words, verbatim, just line-broken** so
the payoff line is the biggest thing on the wall:

```
        ●  (green disc, white ✓)

    You're registered!
    See you September 6.
```

```css
.success { display: grid; justify-items: center; gap: 24px; text-align: center; }
.success .disc {
  width: clamp(72px, 7vw, 128px); aspect-ratio: 1; border-radius: 50%;
  background: var(--success); color: #fff;
  display: grid; place-items: center;
  font-size: clamp(40px, 4vw, 72px); line-height: 1;
}
.success h2 { font-size: clamp(36px, 3.6vw, 68px); font-weight: 800;
              line-height: 1.05; letter-spacing: -.02em; margin: 0; }
.success p  { font-size: clamp(20px, 2vw, 36px); font-weight: 500;
              color: var(--ink-2); margin: 0; }
```

- Keep the card box (border + shadow) — the eye stays where the form was.
- The disc is `aria-hidden`; the success block is `role="status" aria-live="polite"`.
- Move focus to the `<h2>` (`tabIndex={-1}`, `.focus()`) on transition.
- The hero stays on screen. Do not blank the page.
- Keep a small `Register someone else` text button underneath
  (`clamp(16px,1.3vw,22px)`, `--accent`, underlined) — it lets the presenter
  reset live without a page reload. Delete it if the founder prefers a clean
  end frame.

---

## 6 · Agenda & Speakers (below the fold)

Content is fixed by PRD §5b / §5c — do not edit the rows or the one-liners.

**Agenda** — two-column grid, `grid-template-columns: max-content 1fr`,
`column-gap: 40px`, `row-gap: 24px`. Time in `--ink`, 700, `tabular-nums`.
Session in `--ink`, 500. `2px solid #0A0A0A` rule between rows (`padding-block: 20px`).

**Speakers** — three cards, `display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px`.
Each card: `3px solid var(--ink)`, `border-radius: 16px`, `padding: 32px`.
Initials avatar: `72px` circle, `font-size: 28px`, weight 800, white text. Circle
colours (all ≥7:1 with white): `JS #1A38D6` · `ML #0A5C2D` · `PP #7A1560`.

---

## 7 · Deviation from PRD §7 (dark theme) — flagged, not decided

PRD §7 says `bg-gray-950` dark. **I am specifying light, and here is why:** a
projector cannot render black — it renders "no light", which in a lit room is
mid-grey. Dark themes lose the most contrast of anything you can put on a
projector, and the whole page depends on a 30 ft read. White backgrounds throw
light and hold up.

This is a founder call, not mine, and it is a **one-block swap** either way —
no markup changes:

```css
:root {                 /* dark fallback, if the founder wants PRD §7 literally */
  --paper:   #0B0B0F;
  --ink:     #FFFFFF;   /* 19.6:1 */
  --ink-2:   #C9C9D2;   /* 11.9:1 */
  --accent:  #9DB4FF;   /*  9.7:1 */
  --error:   #FF9A93;   /*  9.6:1 */
  --success: #5EE08D;   /* 11.7:1 — with ink text on the disc, not white */
}
```
In dark mode the Register button inverts: `background: var(--ink)` /
`color: var(--paper)` already does the right thing.

---

## 8 · Two things I cannot decide — raised on the issue

1. **The date is 2025.** PRD §5a says "AI Conf 2025 / September 6, 2025" and the
   success line says "See you September 6." Today is **September 4, 2026**. On a
   projector, a 2025 date in front of a 2026 audience reads as a broken demo. A
   date is a promise to attendees, so it is the founder's to change. **Ship the
   PRD values as written**; swapping to 2026 is two string edits if the founder
   says so.
2. **Duplicate-email behaviour.** The deployed page swallows `23505` into the
   success screen. PRD §5d and the Build Plan §4 both say it must show
   `You're already registered.`, and it is an explicit acceptance criterion
   ("Submitting the same email again → inline 'You're already registered.'").
   I have designed the inline error state above. This is your call to wire,
   but the spec and the acceptance criteria agree with each other.

---

## 9 · Delta against what is deployed right now

Ordered by what costs the most on stage. 1–3 are the ones that matter.

1. **Add the Name field.** Form is currently email-only; PRD requires Name +
   Email, and the table has `name text not null`.
2. **Use the PRD's locked strings.** Currently `You're in.` / `Check your inbox
   — details are on the way.` → must be `You're registered! See you September 6.`
   The inbox line also promises an email that §8 explicitly cut — that one is a
   correctness problem, not a style one.
3. **Table is `registrations`, not `signups`** (Build Plan §2). The insert writes
   `{ name, email }`.
4. H1 `9vw` → `5.5vw`, and move to the two-column fold so the form is above it.
5. Add Agenda + Speakers below the fold.
6. Palette → §1 tokens (current `--muted: #5a5a68` and `--line: #d8d8e0` are both
   too light for a projector).

Items 4–6 are polish. 1–3 are the demo.
