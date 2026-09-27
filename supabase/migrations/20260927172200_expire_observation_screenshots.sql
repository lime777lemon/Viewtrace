-- Screenshot bytes expire after plan.retentionDays. Observation metadata
-- (URL, region, time, status, hashes, snapshot_image_url string) stays.
-- snapshot_image_url remains immutable evidence for content_hash.

alter table public.observations
  add column if not exists snapshot_purged_at timestamptz;

comment on column public.observations.snapshot_purged_at is
  'Operational: Blob screenshot deleted after plan screenshot retention. Not evidence; snapshot_image_url / hashes stay.';

create index if not exists observations_snapshot_purge_due_idx
  on public.observations (captured_at)
  where snapshot_purged_at is null
    and snapshot_image_url is not null;
