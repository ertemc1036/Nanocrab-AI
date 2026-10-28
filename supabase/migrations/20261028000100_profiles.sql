-- NanoCrab AI — Phase 2: shared helpers and user profiles.
--
-- Security model (applies to every user-data table in this schema):
--   * Row Level Security is enabled on every table.
--   * Supabase grants broad table privileges to `anon`/`authenticated` by
--     default. We revoke them and grant back only the operations — and, for
--     updates, only the columns — that the app needs.
--   * The `anon` role has no access to any user-data table.

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null or char_length(display_name) between 1 and 80
  ),
  -- Billing hook for later phases. Not writable by users (see grants below).
  plan text not null default 'free' check (plan in ('free')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-user profile. Created by trigger on auth.users insert.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy "profiles: owner can read"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: owner can update"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policies: rows are created by the trigger below and removed
-- by the cascade from auth.users.

-- ---------------------------------------------------------------------------
-- Create a profile whenever a new auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80), '');
begin
  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
