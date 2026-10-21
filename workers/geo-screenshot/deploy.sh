#!/usr/bin/env bash
# US Cloud Run PoC. Does not change production Observation routing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PROJECT="${GCP_PROJECT:-}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${CLOUD_RUN_SERVICE:-viewtrace-geo-screenshot-us}"

if [[ -z "${VIEWTRACE_GEO_WORKER_SECRET:-}" ]]; then
  echo "VIEWTRACE_GEO_WORKER_SECRET is required" >&2
  exit 1
fi

ARGS=(
  run deploy "$SERVICE"
  --source "$ROOT"
  --region "$REGION"
  --memory 2Gi
  --cpu 2
  --timeout 120
  --concurrency 1
  --min-instances 0
  --max-instances 1
  --no-allow-unauthenticated
  --set-env-vars "VIEWTRACE_GEO_WORKER_REGION=US,VIEWTRACE_GEO_WORKER_PROVIDER=gcp"
  --set-env-vars "VIEWTRACE_GEO_WORKER_SECRET=${VIEWTRACE_GEO_WORKER_SECRET}"
)

if [[ -n "$PROJECT" ]]; then
  ARGS+=(--project "$PROJECT")
fi

gcloud "${ARGS[@]}"
echo "PoC service: $SERVICE in $REGION (datacenter exit, requested_country=US)"
