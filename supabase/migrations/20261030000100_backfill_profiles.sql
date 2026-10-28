-- Backfill profiles for auth users created before the profiles migration (and
-- its on_auth_user_created trigger) was applied. Without this, those users have
-- no profile row and every profile read fails. Idempotent: safe to re-run.
insert into public.profiles (id, display_name)
select
  u.id,
  nullif(left(btrim(coalesce(u.raw_user_meta_data ->> 'display_name', '')), 80), '')
from auth.users u
on conflict (id) do nothing;
