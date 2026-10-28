-- NanoCrab AI — Phase 2: agents, agent memories, conversations and messages.
--
-- Ownership is enforced twice:
--   1. RLS: every row's user_id must equal auth.uid().
--   2. Composite foreign keys: a child row's (parent_id, user_id) must match
--      its parent's (id, user_id), so a row can never point at another
--      user's agent or conversation — even though FK checks bypass RLS.

-- ---------------------------------------------------------------------------
-- agents
-- ---------------------------------------------------------------------------
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  avatar text not null default 'bot' check (char_length(avatar) between 1 and 64),
  purpose text not null default '' check (char_length(purpose) <= 1000),
  personality text not null default '' check (char_length(personality) <= 1000),
  instructions text not null default '' check (char_length(instructions) <= 8000),
  language text not null default 'en' check (char_length(language) between 2 and 35),
  template_key text check (template_key is null or char_length(template_key) <= 64),
  -- null = platform default model
  model text check (model is null or char_length(model) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index agents_user_updated_idx on public.agents (user_id, updated_at desc);

create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

alter table public.agents enable row level security;

revoke all on table public.agents from public, anon, authenticated;
grant select, delete on table public.agents to authenticated;
grant insert (
  user_id, name, description, avatar, purpose, personality, instructions,
  language, template_key, model
) on table public.agents to authenticated;
grant update (
  name, description, avatar, purpose, personality, instructions,
  language, template_key, model
) on table public.agents to authenticated;

create policy "agents: owner can read"
  on public.agents for select to authenticated
  using (user_id = (select auth.uid()));
create policy "agents: owner can insert"
  on public.agents for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "agents: owner can update"
  on public.agents for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "agents: owner can delete"
  on public.agents for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- agent_memories: structured knowledge notes, stored separately from messages.
-- Designed so an embedding column (pgvector) can be added later.
-- ---------------------------------------------------------------------------
create table public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  agent_id uuid not null,
  title text not null default '' check (char_length(title) <= 120),
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agent_id, user_id) references public.agents (id, user_id) on delete cascade
);

create index agent_memories_agent_idx
  on public.agent_memories (agent_id, pinned desc, updated_at desc);
create index agent_memories_user_idx on public.agent_memories (user_id);

create trigger agent_memories_set_updated_at
  before update on public.agent_memories
  for each row execute function public.set_updated_at();

alter table public.agent_memories enable row level security;

revoke all on table public.agent_memories from public, anon, authenticated;
grant select, delete on table public.agent_memories to authenticated;
grant insert (user_id, agent_id, title, content, pinned)
  on table public.agent_memories to authenticated;
grant update (title, content, pinned) on table public.agent_memories to authenticated;

create policy "agent_memories: owner can read"
  on public.agent_memories for select to authenticated
  using (user_id = (select auth.uid()));
create policy "agent_memories: owner can insert"
  on public.agent_memories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "agent_memories: owner can update"
  on public.agent_memories for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "agent_memories: owner can delete"
  on public.agent_memories for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  agent_id uuid not null,
  title text not null default 'New conversation'
    check (char_length(btrim(title)) between 1 and 120),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (agent_id, user_id) references public.agents (id, user_id) on delete cascade
);

create index conversations_user_recent_idx
  on public.conversations (user_id, last_message_at desc);
create index conversations_agent_recent_idx
  on public.conversations (agent_id, last_message_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;

revoke all on table public.conversations from public, anon, authenticated;
grant select, delete on table public.conversations to authenticated;
grant insert (user_id, agent_id, title) on table public.conversations to authenticated;
grant update (title, last_message_at) on table public.conversations to authenticated;

create policy "conversations: owner can read"
  on public.conversations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "conversations: owner can insert"
  on public.conversations for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "conversations: owner can update"
  on public.conversations for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "conversations: owner can delete"
  on public.conversations for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- messages: append-only from the user's perspective. Removed with their
-- conversation.
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 100000),
  status text not null default 'complete' check (status in ('complete', 'error')),
  model text check (model is null or char_length(model) <= 100),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id)
    references public.conversations (id, user_id) on delete cascade
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_user_idx on public.messages (user_id);

alter table public.messages enable row level security;

revoke all on table public.messages from public, anon, authenticated;
grant select on table public.messages to authenticated;
grant insert (
  user_id, conversation_id, role, content, status, model, input_tokens, output_tokens
) on table public.messages to authenticated;

create policy "messages: owner can read"
  on public.messages for select to authenticated
  using (user_id = (select auth.uid()));
create policy "messages: owner can insert"
  on public.messages for insert to authenticated
  with check (user_id = (select auth.uid()));
