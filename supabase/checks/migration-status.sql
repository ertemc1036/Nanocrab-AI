-- NanoCrab AI: Migrationsstatus prüfen. NUR LESEND — ändert keine Daten.
-- Im Supabase SQL Editor ausführen (Abfragen einzeln markieren und ausführen).
select m.version, m.name,
       case when m.applied is null then 'ℹ️ siehe Abfrage 2' when m.applied then '✅ angewendet' else '❌ fehlt' end as status
from (values
  ('20261028000100', 'profiles',
     to_regclass('public.profiles') is not null
     and to_regprocedure('public.handle_new_user()') is not null),
  ('20261028000200', 'workspace',
     to_regclass('public.agents') is not null
     and to_regclass('public.conversations') is not null
     and to_regclass('public.messages') is not null),
  ('20261028000300', 'usage_and_account',
     to_regclass('public.usage_events') is not null
     and to_regprocedure('public.delete_my_account()') is not null),
  ('20261029000100', 'founder_and_business',
     to_regclass('public.founder_profiles') is not null
     and to_regclass('public.businesses') is not null),
  ('20261030000100', 'backfill_profiles', null),
  ('20261031000100', 'ai_ceo_workspace',
     to_regclass('public.business_plans') is not null
     and to_regclass('public.revenue_records') is not null
     and to_regprocedure('public.begin_ai_request(text,text,text,bigint,uuid,uuid,integer,integer,bigint,bigint)') is not null),
  ('20261101000100', 'executive_ceo',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'founder_profiles' and column_name = 'leadership_style')
     and exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'business_tasks' and column_name = 'blocked_reason'))
) as m(version, name, applied)
order by m.version;

-- Abfrage 2: Nur ausführen, wenn "profiles" angewendet ist.
-- Ergebnis > 0 bedeutet: Migration 20261030000100_backfill_profiles fehlt noch.
select count(*) as konten_ohne_profil
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Abfrage 3 (optional): Migrationsverlauf der Supabase CLI. Fehler "relation does not exist"
-- bedeutet, dass bisher nicht per CLI migriert wurde.
select version, name from supabase_migrations.schema_migrations order by version;
