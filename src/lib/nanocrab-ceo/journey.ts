import type { Business, FounderProfile } from "./types"

/**
 * The founder journey from zero to Co-Founder mode, and the rule-based "next
 * recommended action". Rules are deterministic and derived only from stored
 * state; AI-generated recommendations arrive in Stage 3 and are labelled
 * separately.
 */

export type JourneyState = {
  profile: FounderProfile | null
  business: Business | null
}

export type MilestoneId =
  | "founder_profile"
  | "business_workspace"
  | "opportunity_validated"
  | "business_plan"
  | "first_customer"
  | "first_revenue"
  | "cofounder_mode"

export type Milestone = {
  id: MilestoneId
  title: string
  description: string
  /** False when the platform can't track this milestone yet. */
  tracked: boolean
  status: "done" | "current" | "upcoming"
}

const MILESTONES: Omit<Milestone, "status">[] = [
  {
    id: "founder_profile",
    title: "Founder profile",
    description: "NanoCrab knows your goals, time, budget and skills.",
    tracked: true,
  },
  {
    id: "business_workspace",
    title: "Business workspace",
    description: "A home for the business you're building.",
    tracked: true,
  },
  {
    id: "opportunity_validated",
    title: "Opportunity validated",
    description: "Evidence that real customers want what you'll offer.",
    tracked: false,
  },
  {
    id: "business_plan",
    title: "Business plan",
    description: "A realistic launch plan broken into tasks.",
    tracked: false,
  },
  {
    id: "first_customer",
    title: "First customer",
    description: "Someone outside your circle commits to buy.",
    tracked: false,
  },
  {
    id: "first_revenue",
    title: "First revenue",
    description: "Money received for your product or service.",
    tracked: false,
  },
  {
    id: "cofounder_mode",
    title: "You become the CEO",
    description: "NanoCrab steps back to be your AI Co-Founder.",
    tracked: false,
  },
]

function isDone(id: MilestoneId, state: JourneyState): boolean {
  switch (id) {
    case "founder_profile":
      return Boolean(state.profile?.onboardingCompletedAt)
    case "business_workspace":
      return state.business !== null
    case "cofounder_mode":
      return state.business?.operatingMode === "cofounder"
    default:
      // Not tracked yet: never shown as done.
      return false
  }
}

export function computeJourney(state: JourneyState): Milestone[] {
  let currentAssigned = false
  return MILESTONES.map((m) => {
    if (isDone(m.id, state)) return { ...m, status: "done" as const }
    if (!currentAssigned) {
      currentAssigned = true
      return { ...m, status: "current" as const }
    }
    return { ...m, status: "upcoming" as const }
  })
}

export type NextAction = {
  id: string
  title: string
  reason: string
  /** Where the founder can act on it, if the feature exists. */
  href: string | null
  cta: string | null
  source: "rules"
}

/** Deterministic next step based on what's missing. */
export function getNextAction(state: JourneyState): NextAction {
  const { profile, business } = state

  if (!profile?.onboardingCompletedAt) {
    return {
      id: "complete_profile",
      title: "Complete your founder profile",
      reason:
        "NanoCrab needs to understand your goals and constraints before recommending anything.",
      href: "/onboarding",
      cta: "Start onboarding",
      source: "rules",
    }
  }

  if (!business) {
    return profile.hasIdea
      ? {
          id: "create_business",
          title: "Set up a workspace for your idea",
          reason:
            "You already have an idea. Giving it a workspace lets NanoCrab track progress and plan around it.",
          href: "/business",
          cta: "Create workspace",
          source: "rules",
        }
      : {
          id: "create_business",
          title: "Set up your business workspace",
          reason:
            "Guided opportunity discovery is still in development. If you have a direction in mind, create a workspace for it now.",
          href: "/business",
          cta: "Create workspace",
          source: "rules",
        }
  }

  const gaps: string[] = []
  if (profile.weeklyHours === null) gaps.push("weekly time")
  if (profile.budget === null) gaps.push("starting budget")
  if (profile.skills.length === 0) gaps.push("skills")
  if (gaps.length > 0) {
    return {
      id: "fill_profile_gaps",
      title: `Add your ${formatList(gaps)}`,
      reason:
        "You skipped these questions. Plans fit much better when NanoCrab knows your real constraints.",
      href: "/onboarding",
      cta: "Update profile",
      source: "rules",
    }
  }

  return {
    id: "await_planning",
    title: "Validate the opportunity and build your plan",
    reason:
      "Your profile and workspace are ready. Opportunity evaluation and planning tools are the next features being built.",
    href: null,
    cta: null,
    source: "rules",
  }
}

function formatList(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

export type DailyAction = {
  taskId: string
  title: string
  reason: string
}

/**
 * Today's recommended action from the founder's real open tasks:
 * overdue first, then due today, then work in progress, then the most
 * important upcoming task. Null when there are no open tasks.
 */
export function getDailyAction(
  tasks: {
    id: string
    title: string
    status: string
    priority: "low" | "medium" | "high"
    dueDate: string | null
  }[],
  today: string
): DailyAction | null {
  const open = tasks.filter((t) => t.status !== "done")
  if (open.length === 0) return null
  const byImportance = (a: (typeof open)[number], b: (typeof open)[number]) =>
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31")

  const overdue = open
    .filter((t) => t.dueDate !== null && t.dueDate < today)
    .sort(byImportance)
  if (overdue[0]) {
    return {
      taskId: overdue[0].id,
      title: overdue[0].title,
      reason: `Overdue since ${overdue[0].dueDate}. Finish it or reschedule it.`,
    }
  }
  const dueToday = open.filter((t) => t.dueDate === today).sort(byImportance)
  if (dueToday[0])
    return { taskId: dueToday[0].id, title: dueToday[0].title, reason: "Due today." }
  const inProgress = open.filter((t) => t.status === "in_progress").sort(byImportance)
  if (inProgress[0]) {
    return {
      taskId: inProgress[0].id,
      title: inProgress[0].title,
      reason: "Already in progress — finishing it beats starting something new.",
    }
  }
  const next = [...open].sort(byImportance)[0]!
  return {
    taskId: next.id,
    title: next.title,
    reason: `Your most important open task (${next.priority} priority${next.dueDate ? `, due ${next.dueDate}` : ""}).`,
  }
}
