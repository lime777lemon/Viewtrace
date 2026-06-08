-- Evidence（証跡）と Annotation（注釈）の分離。
-- Evidence: 記録後に UPDATE 不可。Annotation: note / tags / folder / review_status のみ編集可。

alter table public.observations
  add column if not exists tags text[] not null default '{}',
  add column if not exists folder text,
  add column if not exists review_status text;

comment on column public.observations.tags is
  'Annotation: ユーザー付与タグ（証跡外・編集可）';

comment on column public.observations.folder is
  'Annotation: 整理用フォルダ名（証跡外・編集可）';

comment on column public.observations.review_status is
  'Annotation: レビュー用ステータス open|reviewed|archived|flagged（証跡外・編集可）。取得結果は status 列。';

alter table public.observations
  drop constraint if exists observations_review_status_check;

alter table public.observations
  add constraint observations_review_status_check check (
    review_status is null
    or review_status in ('open', 'reviewed', 'archived', 'flagged')
  );

create or replace function public.observations_protect_evidence_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.url is distinct from old.url then
    raise exception 'observations.url is immutable evidence' using errcode = '23514';
  end if;
  if new.region is distinct from old.region then
    raise exception 'observations.region is immutable evidence' using errcode = '23514';
  end if;
  if new.region_label is distinct from old.region_label then
    raise exception 'observations.region_label is immutable evidence' using errcode = '23514';
  end if;
  if new.captured_at is distinct from old.captured_at then
    raise exception 'observations.captured_at is immutable evidence' using errcode = '23514';
  end if;
  if new.status is distinct from old.status then
    raise exception 'observations.status (capture outcome) is immutable evidence' using errcode = '23514';
  end if;
  if new.snapshot_image_url is distinct from old.snapshot_image_url then
    raise exception 'observations.snapshot_image_url is immutable evidence' using errcode = '23514';
  end if;
  if new.snapshot_sha256 is distinct from old.snapshot_sha256 then
    raise exception 'observations.snapshot_sha256 is immutable evidence' using errcode = '23514';
  end if;
  if new.snapshot_phash is distinct from old.snapshot_phash then
    raise exception 'observations.snapshot_phash is immutable evidence' using errcode = '23514';
  end if;
  if new.snapshot_bytes is distinct from old.snapshot_bytes then
    raise exception 'observations.snapshot_bytes is immutable evidence' using errcode = '23514';
  end if;
  if new.snapshot_content_type is distinct from old.snapshot_content_type then
    raise exception 'observations.snapshot_content_type is immutable evidence' using errcode = '23514';
  end if;
  if new.content_hash is distinct from old.content_hash then
    raise exception 'observations.content_hash is immutable evidence' using errcode = '23514';
  end if;
  if new.capture_conditions is distinct from old.capture_conditions then
    raise exception 'observations.capture_conditions is immutable evidence' using errcode = '23514';
  end if;
  if new.page_title is distinct from old.page_title then
    raise exception 'observations.page_title is immutable evidence' using errcode = '23514';
  end if;
  if new.events is distinct from old.events then
    raise exception 'observations.events is immutable evidence' using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.observations_protect_evidence_fields() is
  'BEFORE UPDATE: 証跡カラムの変更を拒否。note / tags / folder / review_status のみ更新可。';

drop trigger if exists observations_protect_evidence_hashes on public.observations;
drop trigger if exists observations_protect_evidence_fields on public.observations;

create trigger observations_protect_evidence_fields
  before update on public.observations
  for each row
  execute function public.observations_protect_evidence_fields();

comment on trigger observations_protect_evidence_fields on public.observations is
  'Evidence 固定・Annotation 編集可（法務・監査向けの定番分離）。';

drop function if exists public.observations_protect_evidence_hashes();
