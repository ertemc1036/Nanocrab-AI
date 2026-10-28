-- NanoCrab AI — Phase 2: usage tracking and account self-service.

-- ---------------------------------------------------------------------------
-- usage_events: append-only ledger used for limits and future billing.
-- Users can read their own events but cannot insert, edit or delete them
-- directly; the app records usage through record_usage_event(), which pins
-- user_id to the caller and validates the referenced agent/conversation.
-- ---------------------------------------------------------------------------
create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('chat_completion')),
  provider text not null check (char_length(provider) between 1 and 40),
  model text not null check (char_length(model) between 1 and 100),
  agent_id uuid references public.agents (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now()
);

create index usage_events_user_recent_idx on public.usage_events (user_id, created_at desc);

alter table public.usage_events enable row level security;

revoke all on table public.usage_events from public, anon, authenticated;
grant select on table public.usage_events to authenticated;

create policy "usage_events: owner can read"
  on public.usage_events for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.record_usage_event(
  p_event_type text,
  p_provider text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_agent_id uuid default null,
  p_conversation_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_agent_id is not null and not exists (
    select 1 from public.agents a where a.id = p_agent_id and a.user_id = v_uid
  ) then
    raise exception 'agent not found' using errcode = '42501';
  end if;

  if p_conversation_id is not null and not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.user_id = v_uid
  ) then
    raise exception 'conversation not found' using errcode = '42501';
  end if;

  insert into public.usage_events (
    user_id, event_type, provider, model, agent_id, conversation_id,
    input_tokens, output_tokens
  ) values (
    v_uid, p_event_type, p_provider, p_model, p_agent_id, p_conversation_id,
    coalesce(p_input_tokens, 0), coalesce(p_output_tokens, 0)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_usage_event(text, text, text, integer, integer, uuid, uuid)
  from public, anon;
grant execute on function public.record_usage_event(text, text, text, integer, integer, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- delete_my_account: lets a signed-in user permanently delete their own
-- account. Deleting the auth user cascades to every table above.
-- Runs as the function owner so no service-role key is needed in the app.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
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

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
