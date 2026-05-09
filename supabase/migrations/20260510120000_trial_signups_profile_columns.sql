-- 無料登録・認証経由のリードに氏名・会社・電話を保存（任意）
alter table public.trial_signups
  add column if not exists full_name text,
  add column if not exists company_name text,
  add column if not exists phone text;

alter table public.trial_signups drop constraint if exists trial_signups_full_name_len;
alter table public.trial_signups
  add constraint trial_signups_full_name_len check (
    full_name is null or char_length(trim(full_name)) <= 200
  );

alter table public.trial_signups drop constraint if exists trial_signups_company_name_len;
alter table public.trial_signups
  add constraint trial_signups_company_name_len check (
    company_name is null or char_length(trim(company_name)) <= 200
  );

alter table public.trial_signups drop constraint if exists trial_signups_phone_len;
alter table public.trial_signups
  add constraint trial_signups_phone_len check (
    phone is null or char_length(trim(phone)) <= 40
  );

revoke insert on table public.trial_signups from anon, authenticated;
grant insert (email, locale, source, full_name, company_name, phone)
  on table public.trial_signups
  to anon, authenticated;

drop policy if exists "trial_signups_insert_public" on public.trial_signups;
create policy "trial_signups_insert_public"
  on public.trial_signups
  for insert
  to anon, authenticated
  with check (
    source in ('landing', 'auth')
    and email is not null
    and char_length(trim(email)) >= 3
    and char_length(trim(email)) <= 320
    and trim(email) ~ '^[^@]+@[^@]+$'
    and (locale is null or locale in ('ja', 'en'))
    and (full_name is null or char_length(trim(full_name)) <= 200)
    and (company_name is null or char_length(trim(company_name)) <= 200)
    and (phone is null or char_length(trim(phone)) <= 40)
  );

comment on column public.trial_signups.full_name is '任意。Auth user_metadata.full_name と揃える';
comment on column public.trial_signups.company_name is '任意。Auth user_metadata.company_name と揃える';
comment on column public.trial_signups.phone is '任意。Auth user_metadata.phone と揃える';
