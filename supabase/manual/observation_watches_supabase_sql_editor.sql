-- =============================================================================
-- observation_watches — Supabase SQL Editor 用（1 本で実行可・複数回実行しても概ね安全）
-- 元ファイル: supabase/migrations/20260210120000_observation_watches.sql
--           supabase/migrations/20260510140000_observation_watches_schema_align.sql
--
-- 手順: Supabase Dashboard → SQL → New query → 本ファイルをすべて貼り付け → Run
-- 実行後、数秒待ってからダッシュボードで「追加する」を再度試してください。
-- PostgREST が列を認識しない場合は、Dashboard の Project Settings → API で
-- スキーマの再読み込み／プロジェクト再起動を試してください。
-- =============================================================================

-- --- 20260210120000_observation_watches.sql（そのまま）---

-- Scheduled auto-observations (Starter / Pro). Service role + cron bypasses RLS.

CREATE TABLE IF NOT EXISTS public.observation_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  url text NOT NULL,
  region text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  schedule text,
  schedule_frequency text NOT NULL DEFAULT 'daily',
  repeat_count integer NOT NULL DEFAULT 1,
  notify_mode text NOT NULL DEFAULT 'always',
  snapshot_full_page boolean NOT NULL DEFAULT false,
  plan_id text,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_notified_at timestamptz,
  last_diff_ratio double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT observation_watches_schedule_frequency_chk
    CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT observation_watches_notify_mode_chk
    CHECK (notify_mode IN ('always', 'change_only')),
  CONSTRAINT observation_watches_repeat_chk
    CHECK (repeat_count >= 1 AND repeat_count <= 24),
  CONSTRAINT observation_watches_url_nonempty CHECK (length(trim(url)) > 0),
  CONSTRAINT observation_watches_region_nonempty CHECK (length(trim(region)) > 0),
  UNIQUE (user_id, url, region)
);

ALTER TABLE public.observation_watches
  ADD COLUMN IF NOT EXISTS schedule_frequency text,
  ADD COLUMN IF NOT EXISTS repeat_count integer,
  ADD COLUMN IF NOT EXISTS notify_mode text,
  ADD COLUMN IF NOT EXISTS snapshot_full_page boolean,
  ADD COLUMN IF NOT EXISTS plan_id text,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz;

UPDATE public.observation_watches
SET
  schedule_frequency = coalesce(nullif(trim(schedule_frequency), ''), 'daily'),
  repeat_count = least(24, greatest(1, coalesce(repeat_count, 1))),
  notify_mode = coalesce(nullif(trim(notify_mode), ''), 'always'),
  snapshot_full_page = coalesce(snapshot_full_page, false)
WHERE schedule_frequency IS NULL
   OR repeat_count IS NULL
   OR notify_mode IS NULL
   OR snapshot_full_page IS NULL;

CREATE INDEX IF NOT EXISTS observation_watches_due_idx
  ON public.observation_watches (enabled, next_run_at)
  WHERE enabled = true;

DO $$
BEGIN
  IF to_regclass('public.observation_watches') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.observation_watches ENABLE ROW LEVEL SECURITY;

  REVOKE ALL ON TABLE public.observation_watches FROM anon;
  REVOKE ALL ON TABLE public.observation_watches FROM PUBLIC;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.observation_watches TO authenticated;

  DROP POLICY IF EXISTS observation_watches_select_own ON public.observation_watches;
  DROP POLICY IF EXISTS observation_watches_insert_own ON public.observation_watches;
  DROP POLICY IF EXISTS observation_watches_update_own ON public.observation_watches;
  DROP POLICY IF EXISTS observation_watches_delete_own ON public.observation_watches;

  CREATE POLICY observation_watches_select_own
    ON public.observation_watches FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY observation_watches_insert_own
    ON public.observation_watches FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY observation_watches_update_own
    ON public.observation_watches FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY observation_watches_delete_own
    ON public.observation_watches FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
END $$;

COMMENT ON TABLE public.observation_watches IS 'Starter/Pro: periodic screenshot observation + optional email.';

-- --- 20260510140000_observation_watches_schema_align.sql（そのまま）---

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

-- PostgREST にスキーマの再読み込みを促す（環境によっては無視されることがあります）
NOTIFY pgrst, 'reload schema';
