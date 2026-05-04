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
create policy "trial_signups_insert_public"
  on public.trial_signups
  for insert
  to anon, authenticated
  with check (true);

comment on table public.trial_signups is 'LP 無料トライアル登録メール（API 経由で INSERT）';
