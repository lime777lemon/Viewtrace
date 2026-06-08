-- Public client verification links (/verify/{token}). Unguessable; not part of evidence hash.

alter table public.observations
  add column if not exists verify_token text;

comment on column public.observations.verify_token is
  'Public verify URL token (hex). Set at insert or backfilled once. Not hashed in content_hash.';

create unique index if not exists observations_verify_token_unique
  on public.observations (verify_token)
  where verify_token is not null;

alter table public.observations
  drop constraint if exists observations_verify_token_len;

alter table public.observations
  add constraint observations_verify_token_len check (
    verify_token is null
    or char_length(verify_token) = 48
  );
