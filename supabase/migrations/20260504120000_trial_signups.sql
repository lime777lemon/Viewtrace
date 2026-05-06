-- ランディング「無料トライアル」メール登録（anon から INSERT のみ許可）
-- 適用: Supabase SQL Editor で実行、または `supabase db push`

create table if not exists public.trial_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text,
  source text not null default 'landing',
  created_at timestamptz not null default now(),
  constraint trial_signups_email_len check (
    char_length(trim(email)) >= 3
    and char_length(trim(email)) <= 320
  ),
  constraint trial_signups_email_shape check (email ~ '^[^@]+@[^@]+$')
);

create unique index if not exists trial_signups_email_lower_idx
  on public.trial_signups (lower(trim(email)));

alter table public.trial_signups enable row level security;

-- 匿名・ログイン済みいずれも登録用の行追加のみ（読み取りは不可）
-- Advisor 対応: WITH CHECK (true) を避け、許可する行の形を明示する。
-- 併せてカラム単位で INSERT 権限を絞る（id/created_at を任意に書けないように）。
revoke all on table public.trial_signups from anon, authenticated;
grant insert (email, locale, source) on table public.trial_signups to anon, authenticated;
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
  );

comment on table public.trial_signups is 'LP 無料トライアル登録メール（API 経由で INSERT）';
