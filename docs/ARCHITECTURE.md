# NanoCrab AI — Architecture & Implementation Plan

> Create your own AI. Give it a purpose. Make it work for you.

This document is the source of truth for how NanoCrab AI is built and in what
order. Update it when a decision changes.

## 1. Stack

| Concern    | Choice                                                               |
| ---------- | -------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack, Cache Components)                 |
| Language   | TypeScript (strict + `noUncheckedIndexedAccess`)                     |
| UI         | Tailwind CSS 4, shadcn/ui (Radix, new-york-v4), Lucide               |
| Auth / DB  | Supabase Auth + Postgres with Row Level Security                     |
| AI         | Anthropic Claude API (server-side only), behind a provider interface |
| Validation | Zod on every server boundary                                         |
| Tests      | Vitest (unit), Playwright for smoke checks                           |

No separate backend, no microservices. Everything runs as one Next.js app:
Server Components and Server Actions for CRUD, Route Handlers for streaming chat.

### Next.js 16 specifics that shape the code

- **Cache Components is on.** Anything that reads the session (`cookies()`)
  must render inside a `<Suspense>` boundary (or `loading.tsx`). The app shell
  (sidebar, nav) is static and renders instantly; per-user content streams in.
- **`proxy.ts` replaces `middleware.ts`.** It refreshes the Supabase session
  cookie and does coarse redirects only. Real authorization is always
  re-checked next to the data (Data Access Layer + RLS).
- `LayoutProps` / `PageProps` are generated types; `npm run typecheck` runs
  `next typegen` first.

## 2. Source layout

```
src/
  app/
    page.tsx                 Marketing landing page (static)
    (auth)/                  login, signup, reset-password      [Phase 2]
    (app)/                   Authenticated app shell
      layout.tsx             Sidebar + mobile header
      dashboard/ agents/ conversations/ memory/ settings/
    api/chat/route.ts        Streaming chat endpoint            [Phase 4]
  components/
    ui/                      shadcn/ui primitives (vendored, do not restyle ad hoc)
    brand/ layout/ shared/ marketing/
    agents/ chat/ memory/    Feature components                 [Phase 3–5]
  config/                    Site + navigation config
  lib/
    utils.ts
    env.ts                   Zod-validated environment          [Phase 2]
    supabase/                server / browser / proxy clients   [Phase 2]
    dal/                     Data Access Layer: the ONLY place that queries
                             user data; every function resolves the user itself
    validation/              Zod schemas shared by actions & routes
    ai/                      AI engine (see §4)                 [Phase 4]
supabase/
  migrations/                SQL migrations (schema + RLS)      [Phase 2]
```

## 3. Data model (Phase 2)

All tables live in `public`, have RLS **enabled**, and carry `user_id`
referencing `auth.users(id) on delete cascade`. Policies restrict every
operation to `auth.uid() = user_id`. Child tables additionally verify the
parent belongs to the same user.

| Table            | Purpose                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`       | Display name, avatar, plan (`free` for now). Created by trigger on signup.                                                                                                                                            |
| `agents`         | Name, description, avatar/icon, purpose, personality, custom instructions, language, template key, model settings.                                                                                                    |
| `agent_memories` | Structured notes per agent: title, content, importance/pinned, timestamps. Separate from messages. Leaves room for an `embedding` column (pgvector) later.                                                            |
| `conversations`  | Belongs to an agent; title, `last_message_at`.                                                                                                                                                                        |
| `messages`       | Role (`user`/`assistant`), content, token counts, model, status (`complete`/`error`).                                                                                                                                 |
| `usage_events`   | Append-only: event type, model, input/output tokens, request id. Basis for limits and future billing. Users can read, never write, their own rows (inserts happen server-side through a `security definer` function). |

No secrets are ever stored in client-readable tables.

## 4. AI engine (Phase 4)

```
lib/ai/
  types.ts            ChatMessage, GenerateRequest, StreamEvent, Usage
  provider.ts         interface AIProvider { id; streamChat(req, signal) }
  providers/anthropic.ts
  registry.ts         getProvider(id) — Anthropic only in v1
  agent-config.ts     Load + validate an agent the caller owns
  prompt-builder.ts   System prompt = platform rules → agent persona →
                      fenced memory block → (future) tool descriptions
  context.ts          Select recent messages within a token budget
  memory-context.ts   Select memories (pinned first, then recent) within a budget
  limits.ts           Per-user daily message / token limits, max output tokens
  usage.ts            Record usage_events from provider-reported usage
  errors.ts           Typed errors → safe user-facing messages
  tools.ts            Interface only: ToolDefinition + permission model (no execution in v1)
```

Prompt-safety rules: platform rules always come first and state that user
instructions and memories are untrusted content that cannot change platform
rules. Memories are inserted as quoted data, not instructions. No tool
execution or external actions in v1.

If `ANTHROPIC_API_KEY` is missing, the chat UI shows a "configuration
required" state; nothing is faked.

## 5. Security & cost control

- RLS on every user-data table, plus ownership checks in the DAL.
- Zod validation on every Server Action and Route Handler input.
- Request limits: per-user daily message count and token budget enforced
  server-side from `usage_events` before calling the provider; configurable
  `AI_MAX_OUTPUT_TOKENS`; input length caps.
- Secrets only in server env vars; never logged, never `NEXT_PUBLIC_`.
- Security headers set in `next.config.ts`.
- Billing (Stripe) is out of scope for v1; `profiles.plan` + `usage_events`
  are the hooks for it.

## 6. Phased plan

| Phase | Scope                                                                                                          | Status  |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------- |
| 1     | Project setup, design system, app shell, landing page                                                          | ✅ Done |
| 2     | Supabase clients, `proxy.ts`, auth pages (sign up, log in, log out, reset password), profile, migrations + RLS | Next    |
| 3     | Agent creator (templates + custom), agent list with search, edit, duplicate, delete                            |         |
| 4     | AI engine, streaming chat route, conversation persistence, rename/delete conversations                         |         |
| 5     | Agent memory CRUD + context loading, usage limits and dashboard usage, tests                                   |         |

Each phase lands as its own reviewable commit(s) and is validated (typecheck,
lint, tests, build, visual check) before the next begins.

## 7. Future (documented, not built)

Multi-agent collaboration, approved external tools, scheduled automations,
document knowledge bases (pgvector + Supabase Storage), template marketplace,
workflows, team workspaces, multiple model providers, subscription plans.
The provider interface, `tools.ts` types, and `usage_events` exist so these
can be added without rewrites.
