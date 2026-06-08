-- Fixed capture parameters at observation time (browser, UA, geo, viewport, proxy, engine).
-- NULL = legacy rows before this migration (content_hash v1, no backfill).

alter table public.observations
  add column if not exists capture_conditions jsonb;

comment on column public.observations.capture_conditions is
  'Capture parameters frozen at insert time. NULL on legacy rows only.';

alter table public.observations
  drop constraint if exists observations_capture_conditions_object;

alter table public.observations
  add constraint observations_capture_conditions_object check (
    capture_conditions is null
    or (
      jsonb_typeof(capture_conditions) = 'object'
      and (capture_conditions->>'schema_version') ~ '^[0-9]+$'
      and (capture_conditions->>'schema_version')::int >= 1
      and capture_conditions ? 'engine'
      and capture_conditions ? 'browser'
      and capture_conditions ? 'geo'
      and capture_conditions ? 'viewport'
      and capture_conditions ? 'captured_at'
    )
  );
