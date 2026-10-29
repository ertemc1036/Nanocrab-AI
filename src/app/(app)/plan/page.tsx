import type { Metadata } from "next"
import { ClipboardListIcon, SparklesIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { AssumptionsCard } from "@/components/plan/assumptions-card"
import { DraftReview } from "@/components/plan/draft-review"
import { MilestonesCard } from "@/components/plan/milestones-card"
import { PlanSectionCard } from "@/components/plan/plan-section-card"
import { VersionHistory } from "@/components/plan/version-history"
import { ActionButton } from "@/components/shared/action-button"
import { EmptyState } from "@/components/shared/empty-state"
import { isAIConfigured } from "@/lib/ai/config"
import { listMilestones } from "@/lib/dal/milestones"
import { listPlanVersions } from "@/lib/dal/plans"
import { listProposals } from "@/lib/dal/proposals"
import { requireWorkspaceScope } from "@/lib/dal/workspace"
import { EMPTY_PLAN, PLAN_SECTIONS } from "@/lib/nanocrab-ceo/plan"

import { generatePlanAction } from "./actions"

export const metadata: Metadata = { title: "Business Plan" }

export default async function BusinessPlanPage() {
  const scope = await requireWorkspaceScope()
  const [versions, milestones, proposals] = await Promise.all([
    listPlanVersions(scope),
    listMilestones(scope),
    listProposals({ status: "pending", kinds: ["plan_section"] }),
  ])
  const aiConfigured = isAIConfigured()
  const active = versions.find((v) => v.status === "active") ?? null
  const draft =
    versions.find(
      (v) => v.status === "draft" && (!active || v.version > active.version)
    ) ?? null
  const sections = active?.sections ?? EMPTY_PLAN

  const generate = aiConfigured ? (
    <ActionButton
      action={generatePlanAction}
      pendingLabel="Drafting your plan… (up to a minute)"
      className="font-semibold"
    >
      <SparklesIcon />
      {active ? "Generate a new draft" : "Generate plan with NanoCrab"}
    </ActionButton>
  ) : null

  return (
    <div className="space-y-8">
      <PageHeader
        title="Business Plan"
        description={
          active
            ? `${scope.business.name} · version ${active.version}${active.source === "ai" ? " (from a NanoCrab draft you approved)" : ""}`
            : `Build the plan for ${scope.business.name}. Write it yourself or let NanoCrab draft it for your review.`
        }
        actions={generate}
      />
      {!aiConfigured ? (
        <p className="rounded-xl border border-dashed bg-card/50 px-4 py-3 text-sm text-muted-foreground">
          AI drafting isn&apos;t configured. You can still write and version your plan
          yourself.
        </p>
      ) : null}

      {draft ? <DraftReview draft={draft} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {!active && !draft ? (
            <EmptyState
              icon={ClipboardListIcon}
              title="No plan yet"
              description="Start with any section below — each save creates a version — or let NanoCrab draft a full plan for you to review."
            />
          ) : null}
          {PLAN_SECTIONS.map((s) => (
            <PlanSectionCard
              key={`${s.key}-${active?.id ?? "none"}`}
              sectionKey={s.key}
              label={s.label}
              hint={s.hint}
              content={sections[s.key]}
              aiConfigured={aiConfigured}
              hasPlan={Boolean(active)}
              proposals={proposals.filter(
                (p) => p.kind === "plan_section" && p.payload.section === s.key
              )}
            />
          ))}
          <AssumptionsCard
            key={active?.id ?? "none"}
            assumptions={sections.assumptions}
          />
        </div>
        <div className="space-y-6">
          <MilestonesCard milestones={milestones} />
          <VersionHistory versions={versions} />
        </div>
      </div>
    </div>
  )
}
