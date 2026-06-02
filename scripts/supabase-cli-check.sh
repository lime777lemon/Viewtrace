#!/usr/bin/env bash
# Verify Supabase CLI auth + linked project + migration history alignment.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-lywcdvevizwopochcpic}"

echo "== Supabase CLI check =="
echo "project ref: $PROJECT_REF"
echo

if ! command -v supabase >/dev/null 2>&1; then
  echo "FAIL: supabase CLI not installed"
  echo "  brew install supabase/tap/supabase"
  exit 1
fi

echo "CLI: $(supabase --version)"

if ! supabase projects list >/dev/null 2>&1; then
  echo
  echo "FAIL: not logged in"
  echo
  echo "Option A — browser:"
  echo "  supabase login"
  echo
  echo "Option B — access token (Dashboard → Account → Access Tokens):"
  echo "  supabase login --token \"\$SUPABASE_ACCESS_TOKEN\""
  echo "  # or add to .env.local: SUPABASE_ACCESS_TOKEN=sbp_..."
  exit 1
fi

echo "auth: OK"

if [[ ! -f supabase/.temp/project-ref ]]; then
  echo
  echo "WARN: project not linked yet"
  echo "  supabase link --project-ref $PROJECT_REF"
  exit 1
fi

LINKED="$(cat supabase/.temp/project-ref)"
echo "linked: $LINKED"
if [[ "$LINKED" != "$PROJECT_REF" ]]; then
  echo "WARN: linked ref ($LINKED) != expected ($PROJECT_REF)"
fi

echo
echo "== migration list (linked) =="
supabase migration list --linked

echo
echo "OK — you can run: npm run db:push"
