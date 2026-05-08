-- 観測レコード主要フィールドの整合性（コンテンツハッシュ）用。
-- アプリが記録時に SHA-256 hex を保存し、後から同一ペイロードと照合できる。

alter table public.observations
  add column if not exists content_hash text;

comment on column public.observations.content_hash is
  '記録時点の正規化ペイロード（v1）の SHA-256 hex。行の主要カラム改変検知用。';

alter table public.observations
  drop constraint if exists observations_content_hash_len;

alter table public.observations
  add constraint observations_content_hash_len check (
    content_hash is null
    or char_length(content_hash) = 64
  );
