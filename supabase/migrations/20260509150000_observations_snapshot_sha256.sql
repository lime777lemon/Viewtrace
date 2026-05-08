-- Blob に保存したスナップショットファイル本体の SHA-256（hex）。
-- アップロード直前のバイト列で計算（余計な再取得なし）。外部 URL のみの画像は null。

alter table public.observations
  add column if not exists snapshot_sha256 text;

comment on column public.observations.snapshot_sha256 is
  'Blob 保存ファイルのバイト列 SHA-256（hex）。アップロード直前に計算。';

alter table public.observations
  drop constraint if exists observations_snapshot_sha256_len;

alter table public.observations
  add constraint observations_snapshot_sha256_len check (
    snapshot_sha256 is null
    or char_length(snapshot_sha256) = 64
  );
