import { SparklesIcon } from "lucide-react"

import { activatePlanAction, discardDraftAction } from "@/app/(app)/plan/actions"
import { ActionButton } from "@/components/shared/action-button"
import type { PlanVersion } from "@/lib/dal/plans"
import { PLAN_SECTIONS } from "@/lib/nanocrab-ceo/plan"

/** An AI-generated draft. Nothing changes until the founder approves it. */
export function DraftReview({ draft }: { draft: PlanVersion }) {
  return (
    <section
      aria-labelledby="draft-review"
      className="border-gradient rounded-2xl p-5 sm:p-6"
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <SparklesIcon className="size-3.5" />
        Draft by NanoCrab · version {draft.version}
      </p>
      <h2 id="draft-review" className="mt-2 text-lg font-semibold tracking-tight">
        Review this draft before it becomes your plan
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        It&apos;s generated from your profile and workspace. Check every section —
        especially the assumptions — and edit anything that isn&apos;t right after
        activating.
      </p>
      <dl className="mt-5 grid gap-4">
        {PLAN_SECTIONS.map((s) => (
          <div key={s.key}>
            <dt className="text-xs font-medium text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-sm whitespace-pre-wrap">
              {draft.sections[s.key] || (
                <span className="text-muted-foreground italic">Empty</span>
              )}
            </dd>
          </div>
        ))}
        {draft.sections.assumptions.length ? (
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Assumptions to validate
            </dt>
            <dd>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {draft.sections.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <ActionButton
          action={activatePlanAction.bind(null, draft.id)}
          pendingLabel="Activating…"
        >
          Make this my active plan
        </ActionButton>
        <ActionButton variant="ghost" action={discardDraftAction.bind(null, draft.id)}>
          Discard draft
        </ActionButton>
      </div>
    </section>
  )
}
