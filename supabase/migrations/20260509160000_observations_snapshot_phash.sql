-- 知覚ハッシュ（CDN でバイトが変わっても見た目類似を判定）とメタデータ

alter table public.observations
  add column if not exists snapshot_phash text;

alter table public.observations
  add column if not exists snapshot_bytes integer;

alter table public.observations
  add column if not exists snapshot_content_type text;

comment on column public.observations.snapshot_phash is
  '知覚ハッシュ（blockhash / hex）。Blob 保存時に Pro 等で計算。';

comment on column public.observations.snapshot_bytes is
  'Blob にアップロードしたファイルサイズ（バイト）';

comment on column public.observations.snapshot_content_type is
  'Blob の Content-Type（image/webp 等）';

alter table public.observations
  drop constraint if exists observations_snapshot_bytes_nonneg;

alter table public.observations
  add constraint observations_snapshot_bytes_nonneg check (
    snapshot_bytes is null
    or snapshot_bytes >= 0
  );

alter table public.observations
  drop constraint if exists observations_snapshot_content_type_len;

alter table public.observations
  add constraint observations_snapshot_content_type_len check (
    snapshot_content_type is null
    or char_length(snapshot_content_type) <= 80
  );
