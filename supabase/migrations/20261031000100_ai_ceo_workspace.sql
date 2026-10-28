-- NanoCrab AI — AI CEO MVP: chat, AI request ledger, business plans, tasks,
-- milestones, founder memory, AI proposals, revenue and role transitions.
--
-- Same security model as earlier migrations: RLS on every table, Supabase's
-- default grants revoked, minimal column grants, composite foreign keys so
-- rows can never reference another user's data, and security-definer
-- functions only where a user must not write a column directly.

-- ---------------------------------------------------------------------------
-- Conversations belong to a business (AI CEO chat). agent_id becomes optional
-- so the agent infrastructure can still be used for future specialist agents.
-- ---------------------------------------------------------------------------
alter table public.conversations alter column agent_id drop not null;
alter table public.conversations add column business_id uuid;
alter table public.conversations
  add constraint conversations_business_fk
  foreign key (business_id, user_id) references public.businesses (id, user_id) on delete cascade;
alter table public.conversations
  add constraint conversations_owner_target_check
  check (agent_id is not null or business_id is not null);
create index conversations_business_recent_idx
  on public.conversations (business_id, last_message_at desc);
grant insert (business_id) on table public.conversations to authenticated;

-- Assistant replies can be stopped by the user mid-stream.
alter table public.messages drop constraint messages_status_check;
alter table public.messages
  add constraint messages_status_check check (status in ('complete', 'error', 'cancelled'));

-- ---------------------------------------------------------------------------
-- AI request ledger (usage_events). Every AI call is recorded *before* it is
-- made, with a worst-case cost reservation, by begin_ai_request(), which also
-- enforces per-user rate and spending limits atomically. Spend is computed as
-- greatest(reserved, actual), so finishing a request can never lower it.
-- ---------------------------------------------------------------------------
alter table public.usage_events drop constraint usage_events_event_type_check;
alter table public.usage_events
  add constraint usage_events_event_type_check
  check (event_type in ('chat_completion', 'plan_generation', 'plan_section', 'voice'));
alter table public.usage_events
  add column status text not null default 'completed'
    check (status in ('started', 'completed', 'failed', 'cancelled')),
  add column business_id uuid references public.businesses (id) on delete set null,
  add column reserved_cost_micros bigint not null default 0 check (reserved_cost_micros >= 0),
  add column cost_micros bigint not null default 0 check (cost_micros >= 0),
  add column finished_at timestamptz;

drop function if exists public.record_usage_event(text, text, text, integer, integer, uuid, uuid);

create or replace function public.begin_ai_request(
  p_kind text,
  p_provider text,
  p_model text,
  p_reserved_cost_micros bigint,
  p_business_id uuid,
  p_conversation_id uuid,
  p_limit_per_minute integer,
  p_limit_per_day integer,
  p_monthly_limit_micros bigint,
  p_global_daily_limit_micros bigint
)
returns table (request_id bigint, allowed boolean, reason text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  -- Hard ceilings: callers can only make limits stricter, never looser, so a
  -- user calling this function directly can't exhaust the shared budget.
  v_per_minute integer := least(greatest(coalesce(p_limit_per_minute, 0), 0), 30);
  v_per_day integer := least(greatest(coalesce(p_limit_per_day, 0), 0), 500);
  v_monthly bigint := least(greatest(coalesce(p_monthly_limit_micros, 0), 0), 50000000);
  v_reserved bigint := least(greatest(coalesce(p_reserved_cost_micros, 0), 0), 2000000);
  v_count integer;
  v_spend bigint;
  v_id bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_business_id is not null and not exists (
    select 1 from public.businesses b where b.id = p_business_id and b.user_id = v_uid
  ) then
    raise exception 'business not found' using errcode = '42501';
  end if;
  if p_conversation_id is not null and not exists (
    select 1 from public.conversations c where c.id = p_conversation_id and c.user_id = v_uid
  ) then
    raise exception 'conversation not found' using errcode = '42501';
  end if;

  -- Serialize limit checks per user so concurrent requests can't race past them.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select count(*) into v_count from public.usage_events
  where user_id = v_uid and created_at > now() - interval '1 minute';
  if v_count >= v_per_minute then
    return query select null::bigint, false, 'rate_minute';
    return;
  end if;

  select count(*) into v_count from public.usage_events
  where user_id = v_uid and created_at > now() - interval '1 day';
  if v_count >= v_per_day then
    return query select null::bigint, false, 'rate_day';
    return;
  end if;

  select coalesce(sum(greatest(reserved_cost_micros, cost_micros)), 0) into v_spend
  from public.usage_events
  where user_id = v_uid and created_at >= date_trunc('month', now());
  if v_spend + v_reserved > v_monthly then
    return query select null::bigint, false, 'monthly_spend';
    return;
  end if;

  if p_global_daily_limit_micros is not null then
    perform pg_advisory_xact_lock(7461001);
    select coalesce(sum(greatest(reserved_cost_micros, cost_micros)), 0) into v_spend
    from public.usage_events
    where created_at >= date_trunc('day', now());
    if v_spend + v_reserved > greatest(p_global_daily_limit_micros, 0) then
      return query select null::bigint, false, 'global_spend';
      return;
    end if;
  end if;

  insert into public.usage_events (
    user_id, event_type, provider, model, business_id, conversation_id,
    status, reserved_cost_micros
  ) values (
    v_uid, p_kind, p_provider, p_model, p_business_id, p_conversation_id,
    'started', v_reserved
  )
  returning id into v_id;

  return query select v_id, true, null::text;
end;
$$;

create or replace function public.finish_ai_request(
  p_request_id bigint,
  p_status text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cost_micros bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_status not in ('completed', 'failed', 'cancelled') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update public.usage_events
  set status = p_status,
      input_tokens = greatest(coalesce(p_input_tokens, 0), 0),
      output_tokens = greatest(coalesce(p_output_tokens, 0), 0),
      cost_micros = greatest(coalesce(p_cost_micros, 0), 0),
      finished_at = now()
  where id = p_request_id and user_id = v_uid and status = 'started';
end;
$$;

revoke all on function public.begin_ai_request(text, text, text, bigint, uuid, uuid, integer, integer, bigint, bigint) from public, anon;
grant execute on function public.begin_ai_request(text, text, text, bigint, uuid, uuid, integer, integer, bigint, bigint) to authenticated;
revoke all on function public.finish_ai_request(bigint, text, integer, integer, bigint) from public, anon;
grant execute on function public.finish_ai_request(bigint, text, integer, integer, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- business_plans: immutable versions. Exactly one active version per business;
-- AI-generated versions start as drafts and need the founder's approval.
-- ---------------------------------------------------------------------------
create table public.business_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null,
  version integer not null check (version >= 1),
  status text not null check (status in ('draft', 'active', 'archived')),
  source text not null check (source in ('user', 'ai')),
  sections jsonb not null check (
    jsonb_typeof(sections) = 'object' and pg_column_size(sections) <= 60000
  ),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  unique (business_id, version),
  foreign key (business_id, user_id) references public.businesses (id, user_id) on delete cascade
);

create unique index business_plans_one_active_idx
  on public.business_plans (business_id) where status = 'active';
create index business_plans_user_idx on public.business_plans (user_id);

alter table public.business_plans enable row level security;
revoke all on table public.business_plans from public, anon, authenticated;
grant select on table public.business_plans to authenticated;
grant insert (user_id, business_id, version, status, source, sections, note)
  on table public.business_plans to authenticated;
-- Sections are immutable; only the lifecycle status changes.
grant update (status, activated_at) on table public.business_plans to authenticated;

create policy "business_plans: owner can read" on public.business_plans
  for select to authenticated using (user_id = (select auth.uid()));
create policy "business_plans: owner can insert" on public.business_plans
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "business_plans: owner can update" on public.business_plans
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Runs with the caller's privileges (security invoker), so RLS still applies.
create or replace function public.create_plan_version(
  p_business_id uuid,
  p_sections jsonb,
  p_status text,
  p_source text,
  p_note text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version integer;
  v_id uuid;
begin
  if p_status not in ('draft', 'active') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 1));
  select coalesce(max(version), 0) + 1 into v_version
  from public.business_plans where business_id = p_business_id;

  if p_status = 'active' then
    update public.business_plans set status = 'archived'
    where business_id = p_business_id and status = 'active';
  end if;

  insert into public.business_plans (business_id, version, status, source, sections, note)
  values (p_business_id, v_version, p_status, p_source, p_sections, coalesce(p_note, ''))
  returning id into v_id;

  if p_status = 'active' then
    update public.business_plans set activated_at = now() where id = v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.activate_plan_version(p_plan_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business uuid;
begin
  select business_id into v_business from public.business_plans where id = p_plan_id;
  if v_business is null then
    raise exception 'plan not found' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_business::text, 1));
  update public.business_plans set status = 'archived'
  where business_id = v_business and status = 'active' and id <> p_plan_id;
  update public.business_plans set status = 'active', activated_at = now()
  where id = p_plan_id;
end;
$$;

revoke all on function public.create_plan_version(uuid, jsonb, text, text, text) from public, anon;
grant execute on function public.create_plan_version(uuid, jsonb, text, text, text) to authenticated;
revoke all on function public.activate_plan_version(uuid) from public, anon;
grant execute on function public.activate_plan_version(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- business_tasks
-- ---------------------------------------------------------------------------
create table public.business_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  source text not null default 'user' check (source in ('user', 'ai')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, user_id) references public.businesses (id, user_id) on delete cascade
);

create index business_tasks_business_idx on public.business_tasks (business_id, status, due_date);
create index business_tasks_user_idx on public.business_tasks (user_id);
create trigger business_tasks_set_updated_at before update on public.business_tasks
  for each row execute function public.set_updated_at();

alter table public.business_tasks enable row level security;
revoke all on table public.business_tasks from public, anon, authenticated;
grant select, delete on table public.business_tasks to authenticated;
grant insert (user_id, business_id, title, description, status, priority, due_date, source, completed_at)
  on table public.business_tasks to authenticated;
grant update (title, description, status, priority, due_date, completed_at)
  on table public.business_tasks to authenticated;

create policy "business_tasks: owner can read" on public.business_tasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "business_tasks: owner can insert" on public.business_tasks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "business_tasks: owner can update" on public.business_tasks
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "business_tasks: owner can delete" on public.business_tasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- business_milestones
-- ---------------------------------------------------------------------------
create table public.business_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  status text not null default 'planned' check (status in ('planned', 'achieved')),
  target_date date,
  source text not null default 'user' check (source in ('user', 'ai')),
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, user_id) references public.businesses (id, user_id) on delete cascade
);

create index business_milestones_business_idx on public.business_milestones (business_id, status);
create index business_milestones_user_idx on public.business_milestones (user_id);
create trigger business_milestones_set_updated_at before update on public.business_milestones
  for each row execute function public.set_updated_at();

alter table public.business_milestones enable row level security;
revoke all on table public.business_milestones from public, anon, authenticated;
grant select, delete on table public.business_milestones to authenticated;
grant insert (user_id, business_id, title, description, status, target_date, source, achieved_at)
  on table public.business_milestones to authenticated;
grant update (title, description, status, target_date, achieved_at)
  on table public.business_milestones to authenticated;

create policy "business_milestones: owner can read" on public.business_milestones
  for select to authenticated using (user_id = (select auth.uid()));
create policy "business_milestones: owner can insert" on public.business_milestones
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "business_milestones: owner can update" on public.business_milestones
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "business_milestones: owner can delete" on public.business_milestones
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- founder_memories: long-term memory, separate from conversations. Only saved
-- by the founder directly or by the founder approving an AI suggestion.
-- ---------------------------------------------------------------------------
create table public.founder_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid,
  category text not null check (
    category in ('fact', 'goal', 'decision', 'preference', 'challenge', 'progress')
  ),
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  source text not null default 'user' check (source in ('user', 'ai_suggested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, user_id) references public.businesses (id, user_id) on delete cascade
);

create index founder_memories_user_idx on public.founder_memories (user_id, updated_at desc);
create trigger founder_memories_set_updated_at before update on public.founder_memories
  for each row execute function public.set_updated_at();

alter table public.founder_memories enable row level security;
revoke all on table public.founder_memories from public, anon, authenticated;
grant select, delete on table public.founder_memories to authenticated;
grant insert (user_id, business_id, category, content, source)
  on table public.founder_memories to authenticated;
grant update (category, content) on table public.founder_memories to authenticated;

create policy "founder_memories: owner can read" on public.founder_memories
  for select to authenticated using (user_id = (select auth.uid()));
create policy "founder_memories: owner can insert" on public.founder_memories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "founder_memories: owner can update" on public.founder_memories
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "founder_memories: owner can delete" on public.founder_memories
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_proposals: structured changes the AI suggests. Nothing is applied until
-- the founder accepts; acceptance runs a typed, validated server command.
-- ---------------------------------------------------------------------------
create table public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null,
  conversation_id uuid,
  kind text not null check (kind in ('task', 'milestone', 'memory', 'plan_section', 'next_action')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 20000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  foreign key (business_id, user_id) references public.businesses (id, user_id) on delete cascade,
  foreign key (conversation_id, user_id)
    references public.conversations (id, user_id) on delete set null (conversation_id)
);

create index ai_proposals_business_idx on public.ai_proposals (business_id, status, created_at desc);
create index ai_proposals_conversation_idx on public.ai_proposals (conversation_id);
create index ai_proposals_user_idx on public.ai_proposals (user_id);

alter table public.ai_proposals enable row level security;
revoke all on table public.ai_proposals from public, anon, authenticated;
grant select on table public.ai_proposals to authenticated;
grant insert (user_id, business_id, conversation_id, kind, payload)
  on table public.ai_proposals to authenticated;
grant update (status, resolved_at) on table public.ai_proposals to authenticated;

create policy "ai_proposals: owner can read" on public.ai_proposals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_proposals: owner can insert" on public.ai_proposals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "ai_proposals: owner can update" on public.ai_proposals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- revenue_records. "verified" means the founder attached evidence (payment
-- reference, receipt, link) — enforced below. NanoCrab never marks revenue as
-- independently verified; payment-provider verification is future work.
-- ---------------------------------------------------------------------------
create table public.revenue_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null,
  amount numeric(14, 2) not null check (amount > 0 and amount < 1000000000000),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  sale_date date not null,
  item text not null check (char_length(btrim(item)) between 1 and 200),
  customer_reference text not null default '' check (char_length(customer_reference) <= 120),
  evidence_note text not null default '' check (char_length(evidence_note) <= 1000),
  evidence_url text check (
    evidence_url is null or (evidence_url ~ '^https://' and char_length(evidence_url) <= 2048)
  ),
  status text not null default 'self_reported'
    check (status in ('self_reported', 'verified', 'refunded')),
  verified_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'verified' or btrim(evidence_note) <> '' or evidence_url is not null),
  unique (id, user_id),
  foreign key (business_id, user_id) references public.businesses (id, user_id) on delete cascade
);

create index revenue_records_business_idx on public.revenue_records (business_id, sale_date desc);
create index revenue_records_user_idx on public.revenue_records (user_id);
create trigger revenue_records_set_updated_at before update on public.revenue_records
  for each row execute function public.set_updated_at();

alter table public.revenue_records enable row level security;
revoke all on table public.revenue_records from public, anon, authenticated;
grant select, delete on table public.revenue_records to authenticated;
grant insert (
  user_id, business_id, amount, currency, sale_date, item, customer_reference,
  evidence_note, evidence_url, status, verified_at
) on table public.revenue_records to authenticated;
grant update (
  amount, currency, sale_date, item, customer_reference, evidence_note, evidence_url,
  status, verified_at, refunded_at
) on table public.revenue_records to authenticated;

create policy "revenue_records: owner can read" on public.revenue_records
  for select to authenticated using (user_id = (select auth.uid()));
create policy "revenue_records: owner can insert" on public.revenue_records
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "revenue_records: owner can update" on public.revenue_records
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "revenue_records: owner can delete" on public.revenue_records
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_role_transitions + switch_operating_mode(): the only way to change a
-- business's operating mode. Always founder-initiated and always recorded.
-- ---------------------------------------------------------------------------
create table public.ai_role_transitions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null,
  from_mode text not null check (from_mode in ('ceo', 'cofounder')),
  to_mode text not null check (to_mode in ('ceo', 'cofounder')),
  reason text not null check (reason in ('first_revenue', 'manual')),
  revenue_record_id uuid,
  created_at timestamptz not null default now(),
  foreign key (business_id, user_id) references public.businesses (id, user_id) on delete cascade,
  foreign key (revenue_record_id, user_id)
    references public.revenue_records (id, user_id) on delete set null (revenue_record_id)
);

create index ai_role_transitions_business_idx on public.ai_role_transitions (business_id, created_at desc);

alter table public.ai_role_transitions enable row level security;
revoke all on table public.ai_role_transitions from public, anon, authenticated;
grant select on table public.ai_role_transitions to authenticated;

create policy "ai_role_transitions: owner can read" on public.ai_role_transitions
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.switch_operating_mode(
  p_business_id uuid,
  p_to_mode text,
  p_reason text,
  p_revenue_record_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_from text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_to_mode not in ('ceo', 'cofounder') or p_reason not in ('first_revenue', 'manual') then
    raise exception 'invalid arguments' using errcode = '22023';
  end if;

  select operating_mode into v_from from public.businesses
  where id = p_business_id and user_id = v_uid
  for update;
  if v_from is null then
    raise exception 'business not found' using errcode = '42501';
  end if;
  if v_from = p_to_mode then
    raise exception 'already in this mode' using errcode = '22023';
  end if;

  if p_reason = 'first_revenue' and not exists (
    select 1 from public.revenue_records r
    where r.id = p_revenue_record_id and r.user_id = v_uid
      and r.business_id = p_business_id and r.status = 'verified'
  ) then
    raise exception 'first revenue must be a verified record of this business'
      using errcode = '22023';
  end if;

  update public.businesses set operating_mode = p_to_mode where id = p_business_id;
  insert into public.ai_role_transitions (
    user_id, business_id, from_mode, to_mode, reason, revenue_record_id
  ) values (
    v_uid, p_business_id, v_from, p_to_mode, p_reason,
    case when p_reason = 'first_revenue' then p_revenue_record_id end
  );
end;
$$;

revoke all on function public.switch_operating_mode(uuid, text, text, uuid) from public, anon;
grant execute on function public.switch_operating_mode(uuid, text, text, uuid) to authenticated;
