-- =============================================================================
-- audit_events — resource を「(NULL,NULL) または (observation, uuid)」に統一
-- マイグレーションと同一: supabase/migrations/20260511120000_audit_events_resource_observation_only.sql
-- Supabase SQL Editor に貼り付け可。CLI で既に db push 済みなら実行不要。
-- =============================================================================

-- audit_events: resource は「NULL,NULL（システム）」または「observation + UUID」のみに統一する。

-- CSV エクスポート等で使っていた非 observation の resource_type を外す
UPDATE public.audit_events
SET
  resource_type = NULL,
  resource_id = NULL
WHERE
  resource_type IS NOT NULL
  AND resource_type <> 'observation';

-- observation と称しているが resource_id が空／不正な行はシステム扱いに戻す
UPDATE public.audit_events
SET
  resource_type = NULL,
  resource_id = NULL
WHERE
  resource_type = 'observation'
  AND (
    resource_id IS NULL
    OR btrim(resource_id::text) = ''
    OR btrim(resource_id::text) !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );

ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_resource_type_len;

ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_resource_id_len;

ALTER TABLE public.audit_events
  ALTER COLUMN resource_id DROP DEFAULT;

ALTER TABLE public.audit_events
  ALTER COLUMN resource_id TYPE uuid
  USING (
    CASE
      WHEN resource_id IS NULL OR btrim(resource_id::text) = '' THEN NULL
      ELSE btrim(resource_id::text)::uuid
    END
  );

ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_resource_pair_chk;

ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_resource_type_allowed_chk;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_resource_pair_chk
  CHECK (
    (resource_type IS NULL AND resource_id IS NULL)
    OR (
      resource_type = 'observation'
      AND resource_id IS NOT NULL
    )
  );

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_resource_type_allowed_chk
  CHECK (resource_type IS NULL OR resource_type = 'observation');

COMMENT ON COLUMN public.audit_events.resource_type IS 'NULL = システムイベント。observation のときは resource_id 必須（UUID）。';
COMMENT ON COLUMN public.audit_events.resource_id IS 'NULL または observation の UUID。text から uuid へ移行済み。';
