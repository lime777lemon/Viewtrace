-- content_hash / snapshot_sha256 は INSERT 時のみ設定し、UPDATE では変更不可。
-- note など他カラムの UPDATE は従来どおり可能（RLS は observations_update_own のまま）。

create or replace function public.observations_protect_evidence_hashes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.content_hash is distinct from old.content_hash then
    raise exception 'observations.content_hash is immutable after insert'
      using errcode = '23514';
  end if;

  if new.snapshot_sha256 is distinct from old.snapshot_sha256 then
    raise exception 'observations.snapshot_sha256 is immutable after insert'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.observations_protect_evidence_hashes() is
  'BEFORE UPDATE: content_hash と snapshot_sha256 の変更を拒否。証跡フィールドのみ固定。';

drop trigger if exists observations_protect_evidence_hashes on public.observations;

create trigger observations_protect_evidence_hashes
  before update on public.observations
  for each row
  execute function public.observations_protect_evidence_hashes();

comment on trigger observations_protect_evidence_hashes on public.observations is
  '証跡ハッシュ（content_hash, snapshot_sha256）の UPDATE 禁止。note 等は更新可。';
