-- Repair observation_watches when the table exists but columns are missing (PostgREST PGRST204, e.g. next_run_at).

DO $$
BEGIN
  IF to_regclass('public.observation_watches') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.observation_watches
    ADD COLUMN IF NOT EXISTS schedule text,
    ADD COLUMN IF NOT EXISTS schedule_frequency text,
    ADD COLUMN IF NOT EXISTS repeat_count integer,
    ADD COLUMN IF NOT EXISTS notify_mode text,
    ADD COLUMN IF NOT EXISTS snapshot_full_page boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS plan_id text,
    ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_notified_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_diff_ratio double precision,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

  UPDATE public.observation_watches
  SET
    schedule_frequency = coalesce(nullif(trim(schedule_frequency), ''), 'daily'),
    repeat_count = least(24, greatest(1, coalesce(repeat_count, 1))),
    notify_mode = coalesce(nullif(trim(notify_mode), ''), 'always'),
    snapshot_full_page = coalesce(snapshot_full_page, false),
    updated_at = coalesce(updated_at, now()),
    created_at = coalesce(created_at, now())
  WHERE schedule_frequency IS NULL
     OR repeat_count IS NULL
     OR notify_mode IS NULL
     OR snapshot_full_page IS NULL
     OR updated_at IS NULL
     OR created_at IS NULL;

  CREATE INDEX IF NOT EXISTS observation_watches_due_idx
    ON public.observation_watches (enabled, next_run_at)
    WHERE enabled = true;
END $$;
