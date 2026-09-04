#!/usr/bin/env bash
# Push this workspace to a NEW public repo: tvl83/aiconf-demo.
#
#   ./push-to-github.sh
#
# Needs GH_TOKEN (or GITHUB_TOKEN) in the environment, with `repo` scope.
# Run it from any environment that has one — it does not have to be mine.
# Safe to run twice: if the repo already exists it just pushes.
#
# Refuses to touch the production `aiconf` repo. Refuses to push if a tracked
# file looks like it carries a secret.
#
# Note: step 4 commits EVERYTHING in the working tree. This is a shared
# workspace, so that can include another agent's in-flight files. It prints the
# list before committing — read it.

set -euo pipefail
cd "$(dirname "$0")"

REPO_NAME="aiconf-demo"          # never "aiconf" — that one is live production
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die()  { printf '\n\033[1;31mSTOPPED: %s\033[0m\n' "$1" >&2; exit 1; }

# --- 1. Credential ----------------------------------------------------------
step '1/5  Checking the token'

[ -n "$TOKEN" ] || die "No GH_TOKEN or GITHUB_TOKEN in this environment.
Export one and re-run. Do not paste a token into a file or an issue comment."

export GH_TOKEN="$TOKEN"
OWNER="$(gh api user --jq .login 2>/dev/null)" || die "Token rejected by api.github.com (check it has \`repo\` scope)."
echo "authenticated as $OWNER"

# --- 2. Production guardrail ------------------------------------------------
step '2/5  Production guardrail'

if git remote get-url origin >/dev/null 2>&1; then
  EXISTING="$(git remote get-url origin)"
  case "$EXISTING" in
    *"/aiconf-demo"*|*"/aiconf-demo.git") echo "origin already -> $EXISTING" ;;
    *) die "origin points at $EXISTING, which is not aiconf-demo.
This script will not push over an existing remote. Remove it deliberately first." ;;
  esac
fi
echo "target: $OWNER/$REPO_NAME (the live \`aiconf\` repo is never touched)"

# --- 3. Secret scan of what would actually be pushed ------------------------
step '3/5  Scanning tracked files for secrets'

if git ls-files -z | grep -zE '(^|/)\.env($|\.)' | grep -zv '\.example$'; then
  die "A .env file is tracked. Untrack it before pushing."
fi

# Matches credential VALUES, not the word "service_role" — this repo is full of
# code whose job is to reject that key, and word-matching flags the guards.
node secret-scan.mjs || die "Secret scan failed. Push aborted."

# --- 4. Commit identity + any stragglers ------------------------------------
step '4/5  Commit state'

git config user.name  >/dev/null 2>&1 || git config user.name  "tvl83"
git config user.email >/dev/null 2>&1 || git config user.email "thomas@realityflux.llc"

if [ -n "$(git status --porcelain)" ]; then
  echo "uncommitted changes present:"
  git status --short
  git add -A
  git commit -m "aiconf-demo: sign-up page (Next.js 16 static export + Supabase)"
else
  echo "working tree clean"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "branch: $BRANCH at $(git rev-parse --short HEAD)"

# --- 5. Create and push -----------------------------------------------------
step '5/5  Creating the repo and pushing'

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "$OWNER/$REPO_NAME already exists — pushing to it"
  git remote get-url origin >/dev/null 2>&1 \
    || git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  git push -u origin "$BRANCH"
else
  gh repo create "$OWNER/$REPO_NAME" --public --source=. --remote=origin --push
fi

printf '\n\033[1;32mPUSHED\033[0m  https://github.com/%s/%s\n\n' "$OWNER" "$REPO_NAME"
echo "Next: import that repo in Vercel, or run ./go-live.sh <supabase-url> <anon-key>."
