-- NanoCrab AI — AI CEO Stage 1: founder profiles and businesses.
--
-- Same security model as earlier migrations: RLS on every table, Supabase's
-- default grants revoked, minimal (column-level) grants, and composite foreign
-- keys so a row can never reference another user's data.

-- ---------------------------------------------------------------------------
-- businesses: the venture a founder is building. A founder can have several;
-- founder_profiles.current_business_id selects the active one.
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  -- Where the business came from: the founder's own idea or (Stage 2) an
  -- opportunity selected from NanoCrab's evaluations.
  origin text not null default 'own_idea' check (origin in ('own_idea', 'opportunity')),
  status text not null default 'active' check (status in ('active', 'archived')),
  -- 'ceo': NanoCrab leads planning. 'cofounder': the founder leads and NanoCrab
  -- advises. Not directly writable by users; mode changes will go through a
  -- dedicated function that also records the transition (Stage 4).
  operating_mode text not null default 'ceo' check (operating_mode in ('ceo', 'cofounder')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index businesses_user_idx on public.businesses (user_id, updated_at desc);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

alter table public.businesses enable row level security;

revoke all on table public.businesses from public, anon, authenticated;
grant select, delete on table public.businesses to authenticated;
grant insert (user_id, name, description, origin) on table public.businesses to authenticated;
grant update (name, description, status) on table public.businesses to authenticated;

create policy "businesses: owner can read"
  on public.businesses for select to authenticated
  using (user_id = (select auth.uid()));
create policy "businesses: owner can insert"
  on public.businesses for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "businesses: owner can update"
  on public.businesses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "businesses: owner can delete"
  on public.businesses for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- founder_profiles: answers from founder onboarding. Every field except the
-- goal is optional — NanoCrab must treat missing answers as unknown, never
-- infer or invent them. No sensitive identifiers (no address, DOB, ID numbers).
-- ---------------------------------------------------------------------------
create table public.founder_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  goal text not null check (
    goal in ('side_income', 'replace_income', 'build_startup', 'freelance', 'explore', 'other')
  ),
  goal_details text not null default '' check (char_length(goal_details) <= 500),
  skills text[] not null default '{}' check (
    cardinality(skills) <= 20 and char_length(array_to_string(skills, '')) <= 1000
  ),
  interests text[] not null default '{}' check (
    cardinality(interests) <= 20 and char_length(array_to_string(interests, '')) <= 1000
  ),
  weekly_hours smallint check (weekly_hours is null or weekly_hours between 1 and 100),
  -- Starting budget the founder is willing to invest. null = not provided.
  budget_amount numeric(12, 2) check (budget_amount is null or budget_amount >= 0),
  budget_currency text check (budget_currency is null or budget_currency ~ '^[A-Z]{3}$'),
  business_preference text check (
    business_preference is null or business_preference in ('online', 'local', 'either')
  ),
  -- null = question skipped.
  has_idea boolean,
  idea_description text not null default '' check (char_length(idea_description) <= 2000),
  -- ISO 3166-1 alpha-2 country code.
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  current_business_id uuid,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((budget_amount is null) = (budget_currency is null)),
  -- Points only at the founder's own business; cleared if it is deleted.
  foreign key (current_business_id, user_id)
    references public.businesses (id, user_id)
    on delete set null (current_business_id)
);

create trigger founder_profiles_set_updated_at
  before update on public.founder_profiles
  for each row execute function public.set_updated_at();

alter table public.founder_profiles enable row level security;

revoke all on table public.founder_profiles from public, anon, authenticated;
grant select on table public.founder_profiles to authenticated;
grant insert (
  user_id, goal, goal_details, skills, interests, weekly_hours, budget_amount,
  budget_currency, business_preference, has_idea, idea_description, country_code,
  current_business_id, onboarding_completed_at
) on table public.founder_profiles to authenticated;
grant update (
  goal, goal_details, skills, interests, weekly_hours, budget_amount,
  budget_currency, business_preference, has_idea, idea_description, country_code,
  current_business_id, onboarding_completed_at
) on table public.founder_profiles to authenticated;

create policy "founder_profiles: owner can read"
  on public.founder_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "founder_profiles: owner can insert"
  on public.founder_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "founder_profiles: owner can update"
  on public.founder_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
