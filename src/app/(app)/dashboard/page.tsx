import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CircleDollarSignIcon,
  ListChecksIcon,
  SparklesIcon,
} from "lucide-react"

import { CeoDirectiveCard } from "@/components/command-center/ceo-directive-card"
import { JourneyCard } from "@/components/command-center/journey-card"
import { ModeCard } from "@/components/command-center/mode-card"
import { ProposalCard } from "@/components/chat/proposal-card"
import { FormAlert } from "@/components/forms/form-alert"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/dal/auth"
import { getMyFounderProfile } from "@/lib/dal/founder"
import { getActivePlan } from "@/lib/dal/plans"
import { getMyDisplayName } from "@/lib/dal/profiles"
import { listProposals } from "@/lib/dal/proposals"
import { listRevenue, revenueTotals } from "@/lib/dal/revenue"
import { getLastActivityAt } from "@/lib/dal/chat"
import { listMilestones } from "@/lib/dal/milestones"
import { listTasks } from "@/lib/dal/tasks"
import { getWorkspaceScope } from "@/lib/dal/workspace"
import {
  buildAccountabilityReport,
  buildCeoDirective,
} from "@/lib/nanocrab-ceo/accountability"
import { computeJourney, getNextAction } from "@/lib/nanocrab-ceo/journey"
import { DEFAULT_MODE } from "@/lib/nanocrab-ceo/modes"
import { formatMoney } from "@/lib/format"
import { displayNameOrEmail } from "@/lib/user-display"

export const metadata: Metadata = { title: "Command Center" }

export default async function CommandCenterPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const user = await requireUser()
  const profile = await getMyFounderProfile()
  if (!profile?.onboardingCompletedAt) redirect("/onboarding")

  const [scope, displayName, params] = await Promise.all([
    getWorkspaceScope(),
    getMyDisplayName(),
    searchParams,
  ])
  const business = scope?.business ?? null
  const [tasks, plan, revenue, proposals, milestones, lastSessionAt] = scope
    ? await Promise.all([
        listTasks(scope),
        getActivePlan(scope),
        listRevenue(scope),
        listProposals({ status: "pending", limit: 20 }),
        listMilestones(scope),
        getLastActivityAt(scope),
      ])
    : [[], null, [], [], [], null]

  const state = {
    profile,
    business,
    hasActivePlan: plan !== null,
    hasSale: revenue.some((r) => r.status !== "refunded"),
    hasVerifiedRevenue: revenue.some((r) => r.status === "verified"),
  }
  const today = new Date().toISOString().slice(0, 10)
  const report = buildAccountabilityReport(tasks, milestones, today, lastSessionAt)
  const directive = buildCeoDirective(report, getNextAction(state))
  const focusTask = report.mostImportant
    ? (tasks.find((t) => t.id === report.mostImportant?.taskId) ?? null)
    : null
  const journey = computeJourney(state)
  const totals = revenueTotals(revenue)
  const done = tasks.filter((t) => t.status === "done").length
  const inProgress = tasks.filter((t) => t.status === "in_progress").length
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0
  const name = displayNameOrEmail(displayName, user.email)

  return (
    <div className="space-y-8">
      {params.password === "updated" ? (
        <FormAlert
          state={{ status: "success", message: "Your password has been updated." }}
        />
      ) : null}

      <PageHeader title="Command Center" description={`Welcome back, ${name}.`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <CeoDirectiveCard
          className="lg:col-span-2"
          directive={directive}
          report={report}
          focusTask={focusTask}
          executive={profile.leadershipStyle === "executive"}
        />

        <ModeCard mode={business?.operatingMode ?? DEFAULT_MODE} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="current-business"
          className="rounded-2xl border bg-card p-6"
        >
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BriefcaseBusinessIcon className="size-3.5" />
            Current business
          </p>
          {business ? (
            <>
              <h2
                id="current-business"
                className="mt-3 text-lg font-semibold tracking-tight"
              >
                {business.name}
              </h2>
              {business.description ? (
                <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">
                  {business.description}
                </p>
              ) : null}
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link href="/business">Open workspace</Link>
              </Button>
            </>
          ) : (
            <>
              <h2
                id="current-business"
                className="mt-3 text-lg font-semibold tracking-tight"
              >
                No business yet
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a workspace so NanoCrab can track your progress.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link href="/business">Create workspace</Link>
              </Button>
            </>
          )}
        </section>
        <div className="lg:col-span-2">
          <JourneyCard milestones={journey} />
        </div>
      </div>

      <section aria-labelledby="progress" className="space-y-4">
        <h2 id="progress" className="text-sm font-medium text-muted-foreground">
          Progress
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ListChecksIcon className="size-3.5" />
              Task progress
            </p>
            {tasks.length ? (
              <>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {done}
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    / {tasks.length} done
                  </span>
                </p>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label="Tasks completed"
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {inProgress} in progress
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No tasks yet.</p>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2">
              <Link href="/tasks">Open tasks</Link>
            </Button>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CircleDollarSignIcon className="size-3.5" />
              Revenue
            </p>
            {totals.length ? (
              <ul className="mt-3 space-y-2">
                {totals.map((t) => (
                  <li key={t.currency}>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatMoney(t.verified, t.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      verified · {formatMoney(t.selfReported, t.currency)} self-reported
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No revenue recorded yet.
              </p>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2">
              <Link href="/revenue">Open revenue</Link>
            </Button>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <SparklesIcon className="size-3.5" />
              AI recommendations{proposals.length ? ` · ${proposals.length} waiting` : ""}
            </p>
            {proposals.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No suggestions waiting for your review.
              </p>
            ) : null}
            <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2">
              <Link href="/ceo">Ask your AI CEO</Link>
            </Button>
          </div>
        </div>
        {proposals.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {proposals.slice(0, 4).map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
