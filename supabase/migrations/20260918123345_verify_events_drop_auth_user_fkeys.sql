-- Analytics table should not fail when auth.users is missing a UUID
-- (duplicate signUp returns a fake user id; observation.user_id can also lag).

alter table public.verify_events
  drop constraint if exists verify_events_user_id_fkey;

alter table public.verify_events
  drop constraint if exists verify_events_source_user_id_fkey;
