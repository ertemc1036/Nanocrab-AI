# NanoCrab CEO engine

Server- and client-safe domain logic for the AI CEO. No database access here —
persistence lives in `src/lib/dal/*`; this module defines the data shapes,
validation, rules and context that the rest of the app (and later the AI
orchestration layer) builds on.

| File                           | Responsibility                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `types.ts`                     | Domain types: `FounderProfile`, `Business`, `OperatingMode`.                                         |
| `founder-profile/options.ts`   | Onboarding answer options and limits (single source for UI + validation).                            |
| `founder-profile/schema.ts`    | Zod schema for onboarding answers. Only `goal` is required.                                          |
| `founder-profile/countries.ts` | ISO 3166-1 country codes + display names.                                                            |
| `founder-profile/context.ts`   | Founder context: known facts and explicit unknowns; text rendering that quotes founder data as data. |
| `modes.ts`                     | AI CEO / AI Co-Founder mode definitions and universal principles.                                    |
| `journey.ts`                   | Founder journey milestones and the deterministic next recommended action.                            |

Principles every addition must keep:

1. Never invent the founder's skills, budget, experience or market data.
   Missing information is represented as unknown.
2. Separate verified facts from assumptions in every data structure that can
   hold either.
3. Recommendations are proposals. Anything with real-world consequences needs
   explicit founder approval.
4. AI output (Stage 3) is validated against schemas before it is stored or
   shown, and labelled as AI-generated.
