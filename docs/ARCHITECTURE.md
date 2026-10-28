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

## 2. Product model

| Concept                 | Meaning                                                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Founder profile         | Onboarding answers (goal, skills, interests, weekly hours, budget, online/local, idea, country). Only the goal is required; skipped answers are stored as unknown and never inferred.                    |
| Business                | The venture being built. A founder can have several; one is current.                                                                                                                                     |
| Operating mode          | Per business. `ceo` (default): NanoCrab leads planning. `cofounder`: the founder leads, NanoCrab advises. Switching is user-controlled and recorded (Stage 4); first revenue is a milestone, not a gate. |
| Founder journey         | Founder profile → Business workspace → Opportunity validated → Business plan → First customer → First revenue → Co-Founder mode. Milestones are only marked done from stored state.                      |
| Next recommended action | Stage 1: deterministic rules over stored state (labelled "Rule-based"). Stage 3 adds AI recommendations, labelled separately.                                                                            |

### What happened to the agent creator

The earlier generic agent platform is kept as infrastructure rather than as
the product surface:

- `agents` → the AI CEO becomes a system-defined agent configuration per
  business (persona from `nanocrab-ceo/modes.ts`, not a single giant prompt);
  user-created specialist agents can return later.
- `conversations` / `messages` → AI CEO chat threads (Stage 3 adds a
  `business_id` link).
- `agent_memories` → evaluated in Stage 3 as the store for founder/business
  memory notes.
- `usage_events` + `record_usage_event()` → usage accounting for AI CEO calls.

The agent/conversation pages and the "Create AI" button were removed from the
UI because they weren't functional; the tables, RLS and tests remain.

## 3. Source layout

```
src/
  app/
    page.tsx                 Landing page
    (auth)/                  login, signup, forgot/reset password
    auth/confirm/route.ts    Email link handler (token_hash + PKCE code)
    (onboarding)/onboarding/ Founder onboarding (focused full-screen flow)
    (app)/                   Business workspace shell (sidebar + mobile header)
      dashboard/             Command Center
      business/              My Business
      settings/              Profile, founder profile link, password, account
  components/
    ui/                      shadcn/ui primitives (vendored)
    onboarding/ command-center/ business/ settings/ auth/ forms/ layout/ ...
  config/                    Site + navigation (unbuilt sections marked "soon")
  proxy.ts                   Session refresh + optimistic route protection
  lib/
    nanocrab-ceo/            The CEO engine (see §5)
    dal/                     Data Access Layer: the ONLY place that queries user
                             data; every function resolves the user itself
    auth/ validation/ supabase/ env.ts
supabase/
  migrations/                SQL migrations (schema + RLS)
  tests/db/                  RLS tests on real Postgres (npm run test:db)
```

## 4. Data model

All tables live in `public`, have RLS enabled, carry `user_id` referencing
`auth.users(id) on delete cascade`, and are only readable/writable by their
owner. Child tables use composite foreign keys `(parent_id, user_id)` so a row
can never reference another user's data.

| Table                                                   | Purpose                                                                      | Since   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- | ------- |
| `profiles`                                              | Display name, plan. Created by trigger on sign-up.                           | Phase 2 |
| `agents`, `agent_memories`, `conversations`, `messages` | Agent infrastructure, reused by the AI CEO.                                  | Phase 2 |
| `usage_events`                                          | Append-only usage ledger; written only via `record_usage_event()`.           | Phase 2 |
| `founder_profiles`                                      | Onboarding answers + `current_business_id`.                                  | Stage 1 |
| `businesses`                                            | Name, description, origin, status, `operating_mode` (not directly writable). | Stage 1 |

Planned: `business_opportunities`, `business_plans`, `business_tasks`,
`business_milestones` (Stage 2); `revenue_records`, `ai_role_transitions`
(Stage 4).

## 5. NanoCrab CEO engine (`src/lib/nanocrab-ceo/`)

Structured state and validated data, composed per request — not one giant
system prompt. See the module's [README](../src/lib/nanocrab-ceo/README.md).

| Component                                   | Module                                                                                                         | Status                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Founder profile                             | `founder-profile/` (options, Zod schema, countries, context)                                                   | ✅ Stage 1              |
| Founder memory (context)                    | `founder-profile/context.ts` — known facts + explicit unknowns                                                 | ✅ Stage 1 (foundation) |
| Role / mode configuration                   | `modes.ts`                                                                                                     | ✅ Stage 1              |
| Progress tracking                           | `journey.ts` — milestones + rule-based next action                                                             | ✅ Stage 1              |
| Business discovery & opportunity evaluation | `opportunities/`                                                                                               | Stage 2                 |
| Business & task planning                    | `planning/`, `tasks/`                                                                                          | Stage 2                 |
| AI orchestration                            | `ai/` — provider interface, Anthropic provider, prompt composition, context budgets, structured outputs, usage | Stage 3                 |
| Revenue verification                        | `revenue/`                                                                                                     | Stage 4                 |
| Role transitions                            | `transitions/`                                                                                                 | Stage 4                 |

AI rules (enforced in Stage 3 by prompt composition and output validation):
platform rules first; founder data quoted as data, never instructions;
unknowns asked, not assumed; verified research separated from hypotheses; no
income guarantees; no external action without explicit approval.

## 6. Security & cost control

See [SECURITY.md](./SECURITY.md) for the full model, tests and the live
verification checklist.

## 7. Build sequence

| Stage                        | Scope                                                                                                                              | Status                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Phase 1–2                    | Setup, design system, auth, secured schema, DAL                                                                                    | ✅ Done (live Supabase checks pending) |
| Stage 1 — Product foundation | Founder onboarding, founder profile + business models, business workspace (Command Center, My Business), AI CEO mode configuration | ✅ Done (live checks pending)          |
| Stage 2 — Business planning  | Opportunity evaluation, business plan structure, task management, progress tracking                                                | Next                                   |
| Stage 3 — AI integration     | Claude integration, context-aware AI CEO chat, founder memory, structured outputs, usage & cost controls                           |                                        |
| Stage 4 — Revenue transition | Revenue records, verification workflow, role switch, Co-Founder mode                                                               |                                        |

Each stage lands as its own reviewable commit(s) and is validated (typecheck,
lint, unit tests, database tests, build, browser check) before the next.

## 8. Not in the MVP

Autonomous agent orchestration, external tool integrations that act without
approval (publishing, contacting customers, payments), self-trained models,
billing, team workspaces.
