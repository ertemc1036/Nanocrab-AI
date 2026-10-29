# NanoCrab AI — Architecture & Implementation Plan

> NanoCrab leads the process until you earn your first revenue. Then you become
> the CEO, and NanoCrab becomes your AI Co-Founder.

NanoCrab AI is an AI-powered entrepreneurship operating system: a structured
business-building companion that knows the founder, knows their business,
tracks real progress and recommends useful next actions. It is decision
support, not an autonomous actor — the founder approves significant decisions
and every external action, and no income is ever promised.

This document is the source of truth for how NanoCrab AI is built and in what
order. Update it when a decision changes.

## 1. Stack

| Concern    | Choice                                                               |
| ---------- | -------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack, Cache Components)                 |
| Language   | TypeScript (strict + `noUncheckedIndexedAccess`)                     |
| UI         | Tailwind CSS 4, shadcn/ui (Radix, new-york-v4), Lucide               |
| Auth / DB  | Supabase Auth + Postgres with Row Level Security                     |
| AI         | OpenAI Responses API (server-side only), behind a provider interface |
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

## 2. Product model

| Concept           | Meaning                                                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Founder profile   | Onboarding answers (goal, skills, interests, weekly hours, budget, online/local, idea, country). Only the goal is required; skipped answers stay unknown and are never inferred.                                                              |
| Business          | The venture being built. A founder can have several; one is current.                                                                                                                                                                          |
| Operating mode    | Per business. `ceo` (default): NanoCrab leads planning. `cofounder`: the founder leads, NanoCrab advises. Every switch is founder-confirmed and recorded; first verified revenue triggers the offer, and manual switching is always possible. |
| AI CEO chat       | Streaming conversations per business. The AI can propose tasks, milestones, memories, plan updates and next actions — applied only after approval. See [AI.md](./AI.md).                                                                      |
| Business plan     | Ten sections + assumptions to validate; immutable versions; AI drafts need approval before becoming active.                                                                                                                                   |
| Tasks, milestones | Founder-managed; AI suggestions need approval.                                                                                                                                                                                                |
| Founder memory    | Long-term facts, goals, decisions, preferences, challenges, progress — separate from conversations.                                                                                                                                           |
| Revenue           | Self-reported → verified (founder-attached evidence, enforced by the DB) → refunded.                                                                                                                                                          |
| Founder journey   | Profile → Business workspace → Business plan → First customer → First revenue → Co-Founder mode, all tracked from stored state.                                                                                                               |
| Today's action    | From real open tasks (overdue → due today → in progress → most important), else deterministic rules.                                                                                                                                          |

## 3. Source layout

```
src/
  app/
    page.tsx                  Landing page
    (auth)/  auth/confirm/    Authentication
    (onboarding)/onboarding/  Founder onboarding
    (app)/                    Workspace shell
      dashboard/              Command Center
      business/               My Business (+ manual mode switch)
      ceo/  ceo/[id]/         AI CEO chat
      plan/                   Business plan, milestones, versions
      tasks/                  Tasks
      memory/                 Founder memory
      revenue/                Revenue + first-revenue transition
      proposals/actions.ts    Approve/dismiss AI proposals
      settings/
    api/ceo/chat/route.ts     Streaming chat endpoint (NDJSON)
  components/                 UI (shadcn/ui primitives in ui/)
  lib/
    ai/                       Provider-agnostic AI layer + OpenAI provider
    nanocrab-ceo/             Domain logic (see §5)
    dal/                      Data Access Layer — the only DB access
    validation/  supabase/  auth/  env.ts  format.ts  currencies.ts
  proxy.ts
supabase/
  migrations/                 Schema + RLS
  tests/db/                   Security tests on real Postgres
scripts/                      test-db.sh, gen-db-types.mjs, check-supabase.mjs
```

## 4. Data model

All tables live in `public`, have RLS enabled, carry `user_id` referencing
`auth.users(id) on delete cascade`, and are only accessible to their owner.
Child tables use composite foreign keys `(parent_id, user_id)` so rows can
never reference another user's data.

| Table                                   | Purpose                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `profiles`                              | Display name, plan. Created by trigger on sign-up.                                                              |
| `founder_profiles`, `businesses`        | Onboarding answers, leadership style, reply language; businesses with `operating_mode` (not directly writable). |
| `conversations`, `messages`             | AI CEO chat per business.                                                                                       |
| `usage_events`                          | AI request ledger; written only via `begin_ai_request()` / `finish_ai_request()`.                               |
| `business_plans`                        | Immutable plan versions; one active per business.                                                               |
| `business_tasks`, `business_milestones` | Execution tracking; tasks carry success criteria, deliverable, blocker reason.                                  |
| `founder_memories`                      | Long-term memory.                                                                                               |
| `ai_proposals`                          | AI-suggested changes awaiting approval.                                                                         |
| `revenue_records`                       | Sales; "verified" requires evidence (DB check).                                                                 |
| `ai_role_transitions`                   | Audit trail of mode switches via `switch_operating_mode()`.                                                     |
| `agents`, `agent_memories`              | Agent infrastructure kept for future specialist agents.                                                         |

Types are generated from the migrations: `npm run db:types`.

## 5. NanoCrab CEO engine

| Component                                                                | Module                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| AI provider abstraction, OpenAI provider, config, cost, voice interfaces | `src/lib/ai/`                                                   |
| Founder profile, context with explicit unknowns                          | `src/lib/nanocrab-ceo/founder-profile/`                         |
| Modes and universal principles                                           | `nanocrab-ceo/modes.ts`                                         |
| Journey, next action, daily action                                       | `nanocrab-ceo/journey.ts`                                       |
| Leadership styles (Standard / Executive), languages, response headings   | `nanocrab-ceo/leadership.ts`                                    |
| Accountability report, today's CEO directive                             | `nanocrab-ceo/accountability.ts`                                |
| Business plan schema                                                     | `nanocrab-ceo/plan.ts`                                          |
| Typed AI proposals and commands                                          | `nanocrab-ceo/proposals.ts`, `nanocrab-ceo/ai/commands.ts`      |
| Instructions, context budgets, history                                   | `nanocrab-ceo/ai/instructions.ts`, `nanocrab-ceo/ai/context.ts` |
| Chat orchestration                                                       | `nanocrab-ceo/ai/chat-engine.ts`, `app/api/ceo/chat/route.ts`   |
| Structured tasks (plan generation, section improvement)                  | `nanocrab-ceo/ai/structured.ts`                                 |

## 6. Security & cost control

See [SECURITY.md](./SECURITY.md) and [AI.md](./AI.md).

## 7. Build sequence

| Stage     | Scope                                                                       | Status                                       |
| --------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| Phase 1–2 | Setup, design system, auth, secured schema, DAL                             | ✅                                           |
| Stage 1   | Onboarding, founder profile, business workspace                             | ✅                                           |
| A         | OpenAI provider, AI request ledger and limits, streaming chat               | ✅                                           |
| B         | Business planner, tasks, milestones                                         | ✅                                           |
| C         | Founder memory, workspace context                                           | ✅                                           |
| D         | Revenue, verification, first-revenue transition, Command Center integration | ✅                                           |
| E         | Integration tests and polish                                                | ✅ — live OpenAI and Supabase checks pending |

## 8. Not in the MVP

Autonomous agent orchestration, tools that act externally (publishing,
contacting customers, payments), self-trained models, billing, team
workspaces, voice (interfaces only), payment-provider revenue verification,
side-by-side opportunity comparison.
