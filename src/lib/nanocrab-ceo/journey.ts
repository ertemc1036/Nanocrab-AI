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
  /** The business has an active (approved) plan. */
  hasActivePlan?: boolean
  /** At least one sale is recorded (self-reported or verified, not refunded). */
  hasSale?: boolean
  /** At least one sale is verified with evidence. */
  hasVerifiedRevenue?: boolean
}

export type MilestoneId =
  | "founder_profile"
  | "business_workspace"
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
    id: "business_plan",
    title: "Business plan",
    description: "A realistic plan you've reviewed and approved.",
    tracked: true,
  },
  {
    id: "first_customer",
    title: "First customer",
    description: "Your first sale is recorded.",
    tracked: true,
  },
  {
    id: "first_revenue",
    title: "First revenue",
    description: "A sale verified with evidence of payment.",
    tracked: true,
  },
  {
    id: "cofounder_mode",
    title: "You become the CEO",
    description: "NanoCrab steps back to be your AI Co-Founder.",
    tracked: true,
  },
]

function isDone(id: MilestoneId, state: JourneyState): boolean {
  switch (id) {
    case "founder_profile":
      return Boolean(state.profile?.onboardingCompletedAt)
    case "business_workspace":
      return state.business !== null
    case "business_plan":
      return Boolean(state.hasActivePlan)
    case "first_customer":
      return Boolean(state.hasSale || state.hasVerifiedRevenue)
    case "first_revenue":
      return Boolean(state.hasVerifiedRevenue)
    case "cofounder_mode":
      return state.business?.operatingMode === "cofounder"
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

  if (!state.hasActivePlan) {
    return {
      id: "create_plan",
      title: "Create your business plan",
      reason:
        "A short, realistic plan keeps your next steps focused. Write it yourself or let NanoCrab draft it for your review.",
      href: "/plan",
      cta: "Open Business Plan",
      source: "rules",
    }
  }

  if (!state.hasSale && !state.hasVerifiedRevenue) {
    return {
      id: "first_customer",
      title: "Win your first customer",
      reason:
        "Ask your AI CEO for a concrete first-customer plan, then approve the tasks that come out of it.",
      href: "/ceo",
      cta: "Ask your AI CEO",
      source: "rules",
    }
  }

  if (!state.hasVerifiedRevenue) {
    return {
      id: "verify_revenue",
      title: "Verify your first sale",
      reason:
        "Add evidence of payment (a receipt or payment reference) to confirm your first revenue milestone.",
      href: "/revenue",
      cta: "Open Revenue",
      source: "rules",
    }
  }

  if (business.operatingMode === "ceo") {
    return {
      id: "take_the_lead",
      title: "You've earned your first revenue",
      reason:
        "You can now take the lead as CEO and make NanoCrab your AI Co-Founder — if you want to.",
      href: "/revenue",
      cta: "Review the transition",
      source: "rules",
    }
  }

  return {
    id: "grow",
    title: "Plan your next stage of growth",
    reason:
      "Review performance with your AI Co-Founder and decide what to focus on next.",
    href: "/ceo",
    cta: "Open AI Co-Founder",
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
