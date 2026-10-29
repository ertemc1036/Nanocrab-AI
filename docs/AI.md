# NanoCrab AI CEO — AI engine

## Provider and model

- **OpenAI Responses API** via the official `openai` SDK (v7). The deprecated
  Assistants API is not used.
- **Default model: `gpt-5.4-mini`** — a small, cost-efficient model listed in
  the SDK's model catalogue. Change it with `OPENAI_MODEL`.
- **Pricing:** defaults to $0.75 / 1M input and $4.50 / 1M output tokens.
  OpenAI's documentation and pricing pages were not reachable from the build
  environment, so these figures come from published third-party summaries and
  **must be confirmed on https://openai.com/api/pricing** before going live.
  Spending limits are computed from `OPENAI_PRICE_*`.
- `store: false` — conversations are stored in NanoCrab's database, not by
  OpenAI. A SHA-256 hash of the user id is sent as `safety_identifier` for
  abuse monitoring; no email or name.
- The provider sits behind `AIProvider` (`src/lib/ai/types.ts`), so another
  provider can be added in `src/lib/ai/registry.ts` without touching features.

## What the AI CEO sees

Built per request, only from the signed-in founder's data (RLS + DAL):

| Block                                             | Source                                  | Budget                             |
| ------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| Platform rules + role (mode-specific)             | `nanocrab-ceo/ai/instructions.ts`       | fixed                              |
| Founder profile (known facts + explicit unknowns) | `founder_profiles`                      | within `AI_CONTEXT_TOKEN_BUDGET`   |
| Business + operating mode                         | `businesses`                            | 〃                                 |
| Approved memories                                 | `founder_memories`                      | 〃                                 |
| Active plan + assumptions                         | `business_plans`                        | 〃 (sections clipped)              |
| Accountability check + missing info               | computed from tasks/milestones          | 〃                                 |
| Milestones, open/recent tasks                     | `business_milestones`, `business_tasks` | 〃                                 |
| Revenue totals per currency                       | `revenue_records`                       | 〃                                 |
| Recent messages of this conversation              | `messages`                              | separate `AI_CONTEXT_TOKEN_BUDGET` |

Founder-written text is JSON-quoted and labelled as data, and the rules say
it can never override platform rules (prompt-injection mitigation).

## Leadership styles (Standard CEO / Executive CEO)

Leadership style controls **how** NanoCrab leads; operating mode (AI CEO vs AI
Co-Founder) controls **who** leads. Both are stored server-side
(`founder_profiles.leadership_style`, `preferred_language`) and read by the
chat route on every request — the toggle changes the model's instructions,
not just a label.

- **Standard CEO** (default): direct recommendation, collaborative planning,
  flexible accountability.
- **Executive CEO** (opt-in via Settings → CEO leadership or the "Executive
  Mode" switch on the AI CEO page): one objective, imperative orders, at most
  three immediate tasks, overdue work must be finished or re-planned before
  anything new, strict follow-up — firm and constructive, never shaming.

Execution replies use a fixed, localized format (CEO DIRECTIVE / WHY / YOUR
ORDERS / DEADLINE / SUCCESS CRITERIA / REPORT BACK; German headings by
default). Simple factual questions get a short natural answer. Deadlines are
always _proposed_, never claimed as agreed.

Each request also includes an **accountability check** computed from stored
tasks (`nanocrab-ceo/accountability.ts`): overdue, due within 2 days, blocked
(with reason), completed since the last session, completion %, next
milestone, most important task, weekly capacity, an explicit list of missing
information, and recently dismissed suggestions (not to be re-proposed). The
Command Center's "Today's CEO directive" uses the same report — no AI call,
no invented numbers.

Task proposals carry `successCriteria` and `deliverable`; older stored
proposals without them still validate (defaults to empty).

## Workspace commands (proposals)

The model can call five strict function tools — `propose_task`,
`propose_milestone`, `propose_memory`, `propose_plan_update`,
`recommend_next_action`. Arguments are validated with Zod; invalid calls are
dropped. Valid ones are stored as **pending** `ai_proposals` and shown as
approval cards. Nothing changes until the founder approves; approval re-validates
the payload and runs a typed command through the ownership-checked DAL.
There are no tools for external actions (email, publishing, payments).

Business plans: generation returns a Zod-validated structured plan saved as a
**draft**; it becomes active only when the founder approves it.

## Cost and abuse controls

Every AI call is registered **before** it's made by the database function
`begin_ai_request()`, which atomically enforces (per user, serialized with an
advisory lock):

- requests per minute and per day,
- monthly spend, and
- a global daily spend budget across all users.

Each request reserves its worst-case cost (estimated input × 1.25 + 500 tokens,
plus the full output cap). Spend counts `greatest(reserved, actual)`, so a
client can never lower recorded spend. Caller-supplied limits are capped by
hard ceilings in the database (30/min, 500/day, $50/month, $2/request), so
calling the function directly can't loosen them.

Rough worst-case cost per chat message with the defaults: ~$0.01; full plan
generation: ~$0.04. The default $2/month per user allows ~150+ messages.

Other controls: max input length, output token caps, request timeouts,
cancellation (Stop button aborts the OpenAI stream), and safe error messages.

## Voice

Not enabled. `src/lib/ai/voice.ts` defines the provider interface, ephemeral
session credentials and separate limits for a future Realtime integration.

## Live test plan (requires your approval — paid)

Nothing has been sent to OpenAI. To run the first live test:

1. Set `OPENAI_API_KEY` (a project key with a low monthly budget set in the
   OpenAI dashboard) and confirm `OPENAI_PRICE_*` for your model.
2. Keep `AI_MONTHLY_SPEND_LIMIT_USD=2` and `AI_GLOBAL_DAILY_SPEND_LIMIT_USD=1`.
3. Ask the AI CEO one question in English, one in German, one in Turkish;
   generate one plan; improve one section (≈ 5 requests, < $0.10).
4. Check `usage_events` for recorded tokens and cost.
