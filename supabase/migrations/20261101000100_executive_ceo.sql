-- NanoCrab AI — Executive CEO Mode V2. Additive only: existing rows keep
-- their data and get safe defaults.

-- Leadership style (how NanoCrab leads) is separate from operating_mode on
-- businesses (who leads: AI CEO vs AI Co-Founder).
alter table public.founder_profiles
  add column leadership_style text not null default 'standard'
    check (leadership_style in ('standard', 'executive')),
  -- null = no preference: German by default, mirroring the founder's language.
  add column preferred_language text
    check (preferred_language is null or preferred_language in ('de', 'en', 'tr'));

grant insert (leadership_style, preferred_language), update (leadership_style, preferred_language)
  on table public.founder_profiles to authenticated;

-- Executive task fields: what "done" means, what gets delivered, and why a
-- task is stuck (non-empty = blocked).
alter table public.business_tasks
  add column success_criteria text not null default ''
    check (char_length(success_criteria) <= 1000),
  add column deliverable text not null default ''
    check (char_length(deliverable) <= 500),
  add column blocked_reason text not null default ''
    check (char_length(blocked_reason) <= 500);

grant insert (success_criteria, deliverable, blocked_reason), update (success_criteria, deliverable, blocked_reason)
  on table public.business_tasks to authenticated;
