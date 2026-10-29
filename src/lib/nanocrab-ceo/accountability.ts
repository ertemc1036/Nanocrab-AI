import { getDailyAction, type DailyAction, type NextAction } from "./journey"
import type { BusinessMilestone, BusinessTask } from "./types"

/**
 * A factual accountability snapshot computed only from stored tasks and
 * milestones. Never estimates or invents progress.
 */
export type AccountabilityReport = {
  today: string
  total: number
  done: number
  open: number
  completionPct: number
  overdue: BusinessTask[]
  dueSoon: BusinessTask[]
  blocked: BusinessTask[]
  inProgress: BusinessTask[]
  completedSinceLastSession: BusinessTask[]
  nextMilestone: BusinessMilestone | null
  mostImportant: DailyAction | null
  lastSessionAt: string | null
}

export function addDaysIso(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildAccountabilityReport(
  tasks: BusinessTask[],
  milestones: BusinessMilestone[],
  today: string,
  lastSessionAt: string | null
): AccountabilityReport {
  const open = tasks.filter((t) => t.status !== "done")
  const done = tasks.filter((t) => t.status === "done")
  const soonLimit = addDaysIso(today, 2)

  const byDue = (a: BusinessTask, b: BusinessTask) =>
    (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")

  const nextMilestone =
    [...milestones]
      .filter((m) => m.status === "planned")
      .sort((a, b) =>
        (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999")
      )[0] ?? null

  return {
    today,
    total: tasks.length,
    done: done.length,
    open: open.length,
    completionPct: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
    overdue: open.filter((t) => t.dueDate !== null && t.dueDate < today).sort(byDue),
    dueSoon: open
      .filter((t) => t.dueDate !== null && t.dueDate >= today && t.dueDate <= soonLimit)
      .sort(byDue),
    blocked: open.filter((t) => t.blockedReason.trim() !== ""),
    inProgress: open.filter((t) => t.status === "in_progress"),
    completedSinceLastSession: lastSessionAt
      ? done.filter((t) => t.completedAt !== null && t.completedAt > lastSessionAt)
      : [],
    nextMilestone,
    mostImportant: getDailyAction(
      open.filter((t) => t.blockedReason.trim() === ""),
      today
    ),
    lastSessionAt,
  }
}

export type CeoDirective = {
  kind: "overdue" | "blocked" | "task" | "rule"
  headline: string
  detail: string
  href: string | null
  cta: string | null
}

/**
 * Today's CEO directive, derived from facts in priority order: overdue work,
 * then blockers, then the most important open task, then the journey rule.
 */
export function buildCeoDirective(
  report: AccountabilityReport,
  fallback: NextAction
): CeoDirective {
  const first = report.overdue[0]
  if (first) {
    const n = report.overdue.length
    return {
      kind: "overdue",
      headline:
        n === 1
          ? `Finish or reschedule "${first.title}" before starting anything new`
          : `Clear ${n} overdue tasks before starting anything new`,
      detail: `"${first.title}" was due ${first.dueDate}. Complete it, or set a realistic new deadline and note what blocked it.`,
      href: "/tasks",
      cta: "Review overdue tasks",
    }
  }
  const blocked = report.blocked[0]
  if (blocked) {
    return {
      kind: "blocked",
      headline: `Unblock "${blocked.title}"`,
      detail: `Blocked: ${blocked.blockedReason}. Remove the blocker or ask your AI CEO for another route.`,
      href: "/ceo",
      cta: "Solve it with your AI CEO",
    }
  }
  if (report.mostImportant) {
    return {
      kind: "task",
      headline: report.mostImportant.title,
      detail: report.mostImportant.reason,
      href: "/tasks",
      cta: "Open tasks",
    }
  }
  return {
    kind: "rule",
    headline: fallback.title,
    detail: fallback.reason,
    href: fallback.href,
    cta: fallback.cta,
  }
}
