#!/usr/bin/env bash
# Paste the two Supabase values, get a live page. One command, five steps.
#
#   ./go-live.sh https://xxxx.supabase.co eyJhbGciOi...
#
# Or export NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY and run it
# with no arguments. A VERCEL_TOKEN in the environment makes the deployment
# permanent; without one it is anonymous and expires in an hour.
#
# Stops at the first failure. Nothing gets deployed unless the data layer
# verified first, so a bad key fails here rather than on the projector.

set -euo pipefail
cd "$(dirname "$0")"

URL="${1:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
ANON="${2:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die()  { printf '\n\033[1;31mSTOPPED: %s\033[0m\n' "$1" >&2; exit 1; }

# --- 1. Validate the inputs before doing anything slow -----------------------
step '1/5  Checking the two values'

[ -n "$URL" ]  || die "No Supabase URL. Usage: ./go-live.sh <url> <anon-key>"
[ -n "$ANON" ] || die "No anon key. Usage: ./go-live.sh <url> <anon-key>"

URL="${URL%/}"
case "$URL" in
  https://*.supabase.co|https://*.supabase.in) ;;
  *) die "URL should look like https://xxxx.supabase.co — got: $URL" ;;
esac

# A JWT is three dot-separated segments. The role lives in the payload, and the
# service_role key is the one thing that must never reach a browser bundle, so
# it is worth ten lines to refuse it outright rather than trust the paste.
case "$ANON" in
  *.*.*)
    payload=$(printf '%s' "$ANON" | cut -d. -f2)
    case $(( ${#payload} % 4 )) in 2) payload="${payload}==" ;; 3) payload="${payload}=" ;; esac
    claims=$(printf '%s' "$payload" | tr '_-' '/+' | base64 -d 2>/dev/null || true)
    case "$claims" in
      *service_role*) die "That is the SERVICE_ROLE key. It bypasses RLS and must never ship to the browser. Copy the anon / publishable key instead." ;;
      *anon*) echo "    anon key — correct role" ;;
      *) echo "    warning: could not read the role out of that JWT; continuing" ;;
    esac
    ;;
  sb_secret_*) die "That is a secret key (sb_secret_...). Use the publishable key (sb_publishable_...)." ;;
  sb_publishable_*) echo "    publishable key — correct role" ;;
  *) echo "    warning: unrecognised key format; continuing" ;;
esac

# --- 2. Write .env.local -----------------------------------------------------
step '2/5  Writing .env.local'

# .gitignore already covers .env.local; this file must never be committed.
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON
EOF
chmod 600 .env.local
echo "    .env.local written (URL: $URL)"

# --- 3. Verify the data layer against the real project -----------------------
step '3/5  Verifying Supabase (AIC-3 checks)'

# Output is captured so a network-level throw reads as a sentence rather than a
# Node stack trace. On stage the difference matters.
if out=$(SUPABASE_URL="$URL" SUPABASE_ANON_KEY="$ANON" node supabase/verify.mjs 2>&1); then
  printf '%s\n' "$out" | sed 's/^/    /'
  echo "    data layer verified"
else
  printf '%s\n' "$out" | grep -E '^(PASS|FAIL|DO NOT SHIP)' | sed 's/^/    /' || true
  rm -f .env.local   # don't leave a rejected credential lying around for a later build
  case "$out" in
    *ENOTFOUND*|*ECONNREFUSED*|*fetch\ failed*)
      die "Could not reach $URL. Check the project ref in the URL, and that the project is not paused." ;;
    *)
      die "Supabase checks failed — see above. Most likely the schema and RLS are not applied yet (AIC-3). Not deploying." ;;
  esac
fi

# --- 4. Build ----------------------------------------------------------------
step '4/5  Building'

# NEXT_PUBLIC_* values are inlined at build time, not read at runtime, so the
# build has to happen after .env.local exists. Restarting is not enough.
npm run build >/dev/null || die "next build failed"

# `output: 'export'` emits the client bundle under out/_next/static; .next/static
# is checked too so this keeps working if the export mode is ever dropped.
grep -rq "$URL" out/_next/static .next/static 2>/dev/null \
  && echo "    Supabase URL is baked into the bundle" \
  || die "The bundle does not contain the Supabase URL — the page would render the not-configured banner."

grep -q 'not configured' out/index.html 2>/dev/null \
  && die "The exported page still renders the not-configured banner — the build did not see the env vars." \
  || true

# --- 5. Deploy ---------------------------------------------------------------
step '5/5  Deploying'

deploy_args=(--prod --yes)
if [ -n "${VERCEL_TOKEN:-}" ]; then
  deploy_args+=(--token "$VERCEL_TOKEN")
  echo "    using VERCEL_TOKEN — this URL is permanent"
else
  echo "    no VERCEL_TOKEN — anonymous deployment, expires in ~1 hour"
fi

LIVE=$(npx --yes vercel@latest deploy "${deploy_args[@]}" 2>/dev/null | tail -1)
[ -n "$LIVE" ] || die "Deploy produced no URL"

# --- Smoke test the thing that is actually on the projector ------------------
step 'Smoke test'

code=$(curl -s -o /dev/null -w '%{http_code}' "$LIVE")
[ "$code" = "200" ] || die "$LIVE returned HTTP $code"
curl -s "$LIVE" | grep -q 'not configured' \
  && die "$LIVE is live but shows the not-configured banner — env vars did not reach the build." \
  || true

printf '\n\033[1;32mLIVE: %s\033[0m\n' "$LIVE"
echo
echo "Next: submit a real registration on that page and confirm the row in"
echo "Supabase → Table Editor → registrations. Then post the URL on AIC-9."
