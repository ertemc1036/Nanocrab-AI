/**
 * Executive CEO Mode V2 — acceptance scenarios at the prompt level.
 *
 * Each test builds the exact instructions + workspace context the server sends
 * to OpenAI and asserts the behaviour it enforces. No AI calls are made.
 */
import { describe, expect, it } from "vitest"

import { buildAccountabilityReport, buildCeoDirective } from "../accountability"
import { getNextAction } from "../journey"
import { starterPrompts } from "../leadership"
import { EMPTY_PLAN } from "../plan"
import type {
  Business,
  BusinessMilestone,
  BusinessTask,
  FounderProfile,
  LeadershipStyle,
  PreferredLanguage,
} from "../types"
import { buildWorkspaceContext, type WorkspaceSnapshot } from "./context"
import { buildInstructions } from "./instructions"

const TODAY = "2026-11-10"

function profile(over: Partial<FounderProfile> = {}): FounderProfile {
  return {
    userId: "u1",
    goal: "build_startup",
    goalDetails: "",
    skills: ["Sales"],
    interests: [],
    weeklyHours: 14,
    budget: { amount: 1500, currency: "EUR" },
    businessPreference: "online",
    hasIdea: true,
    ideaDescription: "",
    countryCode: "DE",
    currentBusinessId: "b1",
    onboardingCompletedAt: "2026-10-01T00:00:00Z",
    updatedAt: "",
    leadershipStyle: "standard",
    preferredLanguage: null,
    ...over,
  }
}

const dropTap: Business = {
  id: "b1",
  name: "DropTap",
  description: "Same-day delivery app for independent shops in Hamburg",
  origin: "own_idea",
  status: "active",
  operatingMode: "ceo",
  createdAt: "",
  updatedAt: "",
}

function task(over: Partial<BusinessTask> & { id: string; title: string }): BusinessTask {
  return {
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: null,
    source: "user",
    completedAt: null,
    createdAt: "",
    successCriteria: "",
    deliverable: "",
    blockedReason: "",
    ...over,
  }
}

const milestone: BusinessMilestone = {
  id: "m1",
  title: "First 3 paying shops",
  description: "",
  status: "planned",
  targetDate: "2026-12-01",
  source: "user",
  achievedAt: null,
}

function snapshot(over: {
  profile?: FounderProfile
  business?: Business
  tasks?: BusinessTask[]
  milestones?: BusinessMilestone[]
  plan?: boolean
  memories?: boolean
  lastSessionAt?: string | null
  rejected?: string[]
}): WorkspaceSnapshot {
  const tasks = over.tasks ?? []
  const milestones = over.milestones ?? []
  return {
    profile: over.profile ?? profile(),
    business: over.business ?? dropTap,
    plan:
      over.plan === false
        ? null
        : {
            version: 3,
            sections: {
              ...EMPTY_PLAN,
              concept: "Shops order delivery through a simple app",
              firstCustomers: "Visit 20 shops in Altona",
            },
          },
    milestones,
    tasks,
    memories:
      over.memories === false
        ? []
        : [
            {
              id: "x",
              category: "decision",
              content: "Start with florists before other shops",
              source: "user",
              businessId: "b1",
              updatedAt: "",
            },
          ],
    revenue: [],
    today: TODAY,
    accountability: buildAccountabilityReport(
      tasks,
      milestones,
      TODAY,
      over.lastSessionAt ?? null
    ),
    rejectedSuggestions: over.rejected ?? [],
  }
}

function prompt(
  s: WorkspaceSnapshot,
  style: LeadershipStyle = "standard",
  language: PreferredLanguage | null = null
) {
  const instructions = buildInstructions({
    mode: s.business.operatingMode,
    style,
    language,
    today: TODAY,
  })
  return `${instructions}\n\n${buildWorkspaceContext(s, 8000).text}`
}

describe("Scenario 1 — active business with saved context", () => {
  const text = prompt(
    snapshot({
      tasks: [task({ id: "t", title: "Call 10 florists" })],
      milestones: [milestone],
    })
  )

  it("gives NanoCrab the stored business, plan, memory and tasks", () => {
    expect(text).toContain('"DropTap"')
    expect(text).toContain("Same-day delivery app for independent shops in Hamburg")
    expect(text).toContain("Visit 20 shops in Altona")
    expect(text).toContain("Start with florists before other shops")
    expect(text).toContain("Call 10 florists")
  })

  it("forbids asking for information that is already stored", () => {
    expect(text).toMatch(/Never ask for information already in the profile, business/)
    expect(text).toMatch(
      /don't ask the founder to describe a business that is already stored/
    )
  })

  it("prioritises existing work over new ideas", () => {
    expect(text).toMatch(
      /Prioritise finishing existing work and the current business over new ideas/
    )
  })
})

describe('Scenario 2 — "What should I do today?"', () => {
  const s = snapshot({
    tasks: [
      task({ id: "a", title: "Write shop pitch", priority: "low" }),
      task({ id: "b", title: "Call 10 florists", priority: "high", dueDate: TODAY }),
    ],
  })
  const text = prompt(s)

  it("makes NanoCrab decide instead of asking what the founder wants", () => {
    expect(text).toMatch(/Never ask the founder what they want to do today/)
    expect(text).toMatch(/decide the most important next objective yourself/)
  })

  it("provides the most important task from real data", () => {
    expect(text).toContain('Most important open task: "Call 10 florists" — Due today.')
  })

  it("requires the executive response format with orders, deadline and report-back", () => {
    for (const heading of [
      "CEO-DIREKTIVE",
      "WARUM",
      "DEINE AUFGABEN",
      "DEADLINE",
      "ERFOLGSKRITERIEN",
      "RÜCKMELDUNG",
    ]) {
      expect(text).toContain(`**${heading}**`)
    }
    expect(text).toMatch(/Always call it proposed; never claim a deadline was agreed/)
  })

  it("bases deadlines on real capacity", () => {
    expect(text).toContain("Capacity: 14 hours per week (≈2 h/day); 2 open tasks.")
  })
})

describe("Scenario 3 — three overdue tasks", () => {
  const overdue = [
    task({ id: "1", title: "Customer outreach", dueDate: "2026-11-09" }),
    task({ id: "2", title: "Pricing page", dueDate: "2026-11-01" }),
    task({ id: "3", title: "Shop list", dueDate: "2026-11-05" }),
  ]
  const s = snapshot({
    tasks: [...overdue, task({ id: "4", title: "New feature", priority: "high" })],
  })

  it("lists the overdue tasks oldest first, as facts", () => {
    const text = buildWorkspaceContext(s, 8000).text
    expect(text).toContain("- Overdue (3):")
    expect(text.indexOf("Pricing page")).toBeLessThan(text.indexOf("Shop list"))
    expect(text.indexOf("Shop list")).toBeLessThan(text.indexOf("Customer outreach"))
  })

  it("requires complete-or-revise before new work, firmly but without shaming", () => {
    const text = prompt(s, "executive")
    expect(text).toMatch(
      /require the founder to either finish them or revise the deadline/
    )
    expect(text).toMatch(/Be firm and constructive, never shaming/)
    expect(text).toMatch(/no insults, sarcasm, guilt-tripping, pressure tactics/)
  })

  it("makes clearing overdue work today's directive", () => {
    const directive = buildCeoDirective(
      s.accountability,
      getNextAction({ profile: s.profile, business: s.business })
    )
    expect(directive).toMatchObject({
      kind: "overdue",
      headline: "Clear 3 overdue tasks before starting anything new",
    })
  })
})

describe("Scenario 4 — simple factual question", () => {
  it("answers naturally without forcing the executive format", () => {
    expect(prompt(snapshot({}))).toMatch(
      /For simple factual questions or clarifications, answer briefly and naturally without the format/
    )
  })
})

describe("Scenario 5 — no business information", () => {
  const empty = snapshot({
    profile: profile({ skills: [], weeklyHours: null, budget: null, countryCode: null }),
    business: { ...dropTap, description: "" },
    plan: false,
    memories: false,
  })
  const text = prompt(empty)

  it("explicitly lists what is missing instead of inventing it", () => {
    expect(text).toContain(
      "- Not recorded yet: business description, an approved business plan, any tasks, milestones, revenue records."
    )
    expect(text).toMatch(
      /Unknown \(the founder skipped these; ask before relying on them, never assume\)/
    )
    expect(text).toContain("weekly hours unknown")
  })

  it("still leads: ask at most two essential questions and give a provisional recommendation", () => {
    expect(text).toMatch(
      /Ask at most two, and still give your best provisional recommendation/
    )
  })

  it("without any business, the rule-based directive is to create one", () => {
    expect(getNextAction({ profile: empty.profile, business: null })).toMatchObject({
      id: "create_business",
      href: "/business",
    })
  })
})

describe("Scenario 6 — German preference", () => {
  it("defaults to German when no language is set", () => {
    const text = buildInstructions({
      mode: "ceo",
      style: "standard",
      language: null,
      today: TODAY,
    })
    expect(text).toMatch(/reply in German by default/)
    expect(text).toContain("**CEO-DIREKTIVE**")
    expect(starterPrompts(null)[0]).toBe("Was soll ich heute tun?")
  })

  it("always uses an explicitly chosen language", () => {
    expect(
      buildInstructions({ mode: "ceo", style: "standard", language: "de", today: TODAY })
    ).toMatch(/Always reply in German/)
    const en = buildInstructions({
      mode: "ceo",
      style: "standard",
      language: "en",
      today: TODAY,
    })
    expect(en).toMatch(/Always reply in English/)
    expect(en).toContain("**YOUR ORDERS**")
    const tr = buildInstructions({
      mode: "ceo",
      style: "standard",
      language: "tr",
      today: TODAY,
    })
    expect(tr).toContain("**CEO DİREKTİFİ**")
    expect(starterPrompts("tr")[0]).toBe("Bugün ne yapmalıyım?")
  })
})

describe("Scenario 7 — switching Standard ↔ Executive changes server-side behaviour", () => {
  const standard = buildInstructions({
    mode: "ceo",
    style: "standard",
    language: null,
    today: TODAY,
  })
  const executive = buildInstructions({
    mode: "ceo",
    style: "executive",
    language: null,
    today: TODAY,
  })

  it("produces different instructions", () => {
    expect(standard).not.toBe(executive)
    expect(standard).toContain("# Leadership style: Standard CEO")
    expect(executive).toContain("# Leadership style: Executive CEO")
  })

  it("executive: one objective, imperative instructions, max three tasks, strict follow-up", () => {
    expect(executive).toMatch(/Pick ONE objective/)
    expect(executive).toMatch(/direct instructions in the imperative/)
    expect(executive).toMatch(/Never give more than three immediate tasks/)
    expect(executive).toMatch(
      /Follow up on unfinished and blocked work in every execution reply/
    )
  })

  it("standard: collaborative and flexible", () => {
    expect(standard).toMatch(/invite the founder to adjust it/)
    expect(standard).not.toMatch(/Pick ONE objective/)
  })

  it("keeps platform rules identical and first in both styles", () => {
    const rules = (t: string) => t.slice(0, t.indexOf("# Identity"))
    expect(rules(standard)).toBe(rules(executive))
    expect(executive.startsWith("# Platform rules")).toBe(true)
  })

  it("is independent of the AI CEO / Co-Founder role", () => {
    const coExec = buildInstructions({
      mode: "cofounder",
      style: "executive",
      language: null,
      today: TODAY,
    })
    expect(coExec).toMatch(/The founder is the CEO and makes the calls/)
    expect(coExec).toContain("# Leadership style: Executive CEO")
    expect(coExec).toContain("**EMPFEHLUNG**")
  })
})

describe("Scenario 8 — founder rejects a proposed task", () => {
  it("tells NanoCrab not to propose rejected suggestions again", () => {
    const text = prompt(snapshot({ rejected: ["Build a mobile app"] }))
    expect(text).toContain("Suggestions the founder rejected recently")
    expect(text).toContain('"Build a mobile app"')
    expect(text).toMatch(/don't re-propose suggestions the founder rejected/)
  })
})

describe("Scenario 9 — founder returns after completing a task", () => {
  const s = snapshot({
    lastSessionAt: "2026-11-08T18:00:00Z",
    tasks: [
      task({
        id: "d",
        title: "Call 10 florists",
        status: "done",
        completedAt: "2026-11-09T10:00:00Z",
      }),
      task({
        id: "old",
        title: "Old done task",
        status: "done",
        completedAt: "2026-11-01T10:00:00Z",
      }),
      task({ id: "o", title: "Send offer to 3 florists", dueDate: "2026-11-11" }),
    ],
  })

  it("reports what was completed since the last session — and only that", () => {
    const report = s.accountability
    expect(report.completedSinceLastSession.map((t) => t.title)).toEqual([
      "Call 10 florists",
    ])
    const text = buildWorkspaceContext(s, 8000).text
    expect(text).toContain("- Completed since last session (1):")
    expect(text).toContain("Last session: 2026-11-08.")
  })

  it("acknowledges briefly without praise and moves to the next result", () => {
    expect(prompt(s, "executive")).toMatch(
      /acknowledge in one short line \(no praise\), then build on the result/
    )
  })

  it("surfaces upcoming deadlines", () => {
    expect(s.accountability.dueSoon.map((t) => t.title)).toEqual([
      "Send offer to 3 florists",
    ])
  })
})

describe("accountability report and directive", () => {
  it("keeps blocked tasks out of 'most important' and makes unblocking the directive", () => {
    const tasks = [
      task({
        id: "b",
        title: "Launch shop",
        priority: "high",
        blockedReason: "No payment provider",
      }),
      task({ id: "c", title: "Write FAQ", priority: "low" }),
    ]
    const report = buildAccountabilityReport(tasks, [], TODAY, null)
    expect(report.blocked.map((t) => t.id)).toEqual(["b"])
    expect(report.mostImportant?.taskId).toBe("c")
    expect(
      buildCeoDirective(report, getNextAction({ profile: profile(), business: dropTap }))
    ).toMatchObject({
      kind: "blocked",
      headline: 'Unblock "Launch shop"',
    })
  })

  it("computes completion from real tasks only", () => {
    const report = buildAccountabilityReport(
      [
        task({ id: "1", title: "a", status: "done", completedAt: "x" }),
        task({ id: "2", title: "b" }),
      ],
      [milestone],
      TODAY,
      null
    )
    expect(report).toMatchObject({ total: 2, done: 1, open: 1, completionPct: 50 })
    expect(report.nextMilestone?.title).toBe("First 3 paying shops")
    expect(report.completedSinceLastSession).toEqual([])
  })

  it("falls back to the journey rule when there are no tasks", () => {
    const report = buildAccountabilityReport([], [], TODAY, null)
    const directive = buildCeoDirective(
      report,
      getNextAction({ profile: profile(), business: dropTap })
    )
    expect(directive.kind).toBe("rule")
  })

  it("keeps the accountability check within a tight context budget", () => {
    const tasks = Array.from({ length: 60 }, (_, i) =>
      task({ id: `t${i}`, title: `Overdue task ${i} `.repeat(5), dueDate: "2026-10-01" })
    )
    const result = buildWorkspaceContext(snapshot({ tasks }), 1500)
    expect(result.estimatedTokens).toBeLessThanOrEqual(1500)
    expect(result.text).toContain("Accountability check")
  })
})
