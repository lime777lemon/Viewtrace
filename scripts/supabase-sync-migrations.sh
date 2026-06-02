#!/usr/bin/env bash
# Sync Supabase migration history between this repo and the linked remote project.
#
# Prerequisites:
#   supabase login
#   supabase link --project-ref lywcdvevizwopochcpic
#   Docker Desktop running (required for `pull` mode only)
#
# Usage:
#   ./scripts/supabase-sync-migrations.sh repair   # recommended: align history, keep local SQL files
#   ./scripts/supabase-sync-migrations.sh pull     # squash: archive local SQL, db pull remote schema
#   ./scripts/supabase-sync-migrations.sh list     # show local vs remote migration list

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-lywcdvevizwopochcpic}"

# Remote-only versions recorded on production but absent from supabase/migrations/.
REMOTE_ONLY=(
  20260506070130
  20260507060037
  20260507061222
  20260507135815
  20260508191035
  20260508191353
  20260508192012
  20260508193212
  20260511105925
  20260511122650
  20260511122918
  20260516114551
  20260516115216
  20260526014558
)

require_cli() {
  if ! command -v supabase >/dev/null 2>&1; then
    echo "error: supabase CLI not found" >&2
    exit 1
  fi
}

require_linked() {
  if ! supabase projects list >/dev/null 2>&1; then
    echo "error: run 'supabase login' first" >&2
    exit 1
  fi
}

local_versions() {
  local f base
  for f in supabase/migrations/*.sql; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f")"
    echo "${base%%_*}"
  done | sort -u
}

cmd_list() {
  require_cli
  require_linked
  echo "=== migration list (linked) ==="
  supabase migration list --linked
}

# Mark remote-only rows reverted, then mark every local migration file as applied on remote.
# Safe when production schema already matches what local migrations describe.
cmd_repair() {
  require_cli
  require_linked

  echo "Step 1/3: revert remote-only migration history (${#REMOTE_ONLY[@]} versions)…"
  supabase migration repair --status reverted "${REMOTE_ONLY[@]}"

  mapfile -t LOCAL < <(local_versions)
  if ((${#LOCAL[@]} == 0)); then
    echo "error: no files in supabase/migrations/" >&2
    exit 1
  fi

  echo "Step 2/3: mark local repo migrations as applied on remote (${#LOCAL[@]} versions)…"
  supabase migration repair --status applied "${LOCAL[@]}"

  echo "Step 3/3: verify"
  supabase migration list --linked
  echo
  echo "Done. Future changes: add supabase/migrations/<timestamp>_name.sql then run:"
  echo "  supabase db push"
}

cmd_pull() {
  require_cli
  require_linked

  if ! docker info >/dev/null 2>&1; then
    echo "error: Docker is not running (required for supabase db pull)" >&2
    exit 1
  fi

  ARCHIVE_DIR="supabase/migrations_archive/$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$ARCHIVE_DIR"

  echo "This will:"
  echo "  1. Move supabase/migrations/*.sql → $ARCHIVE_DIR/"
  echo "  2. Revert remote-only migration history"
  echo "  3. supabase db pull remote_schema (new baseline from production)"
  read -r -p "Continue? [y/N] " ans
  if [[ "${ans,,}" != "y" ]]; then
    echo "Aborted."
    exit 0
  fi

  shopt -s nullglob
  files=(supabase/migrations/*.sql)
  if ((${#files[@]} > 0)); then
    mv supabase/migrations/*.sql "$ARCHIVE_DIR/"
    echo "Archived ${#files[@]} file(s) to $ARCHIVE_DIR"
  fi
  shopt -u nullglob

  echo "Reverting remote-only history…"
  supabase migration repair --status reverted "${REMOTE_ONLY[@]}"

  echo "Pulling remote schema…"
  supabase db pull remote_schema --linked

  echo "=== result ==="
  supabase migration list --linked
  echo
  echo "Archived SQL kept at: $ARCHIVE_DIR"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") <repair|pull|list>

  repair  Align remote history with local supabase/migrations/ (recommended).
          Does NOT change production schema — history table only.

  pull    Archive local migrations and create one baseline from remote schema.
          Requires Docker. Use when you want a clean single migration file.

  list    Show linked local vs remote migration list.

Project ref: $PROJECT_REF (override with SUPABASE_PROJECT_REF)

Before first run:
  supabase login
  supabase link --project-ref $PROJECT_REF
EOF
}

main() {
  case "${1:-}" in
    repair) cmd_repair ;;
    pull) cmd_pull ;;
    list) cmd_list ;;
    -h|--help|help|"") usage ;;
    *)
      echo "unknown command: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
