import { describe, expect, it } from "vitest"

import { computeJourney, getDailyAction, getNextAction } from "./journey"
import type { Business, FounderProfile } from "./types"

const profile: FounderProfile = {
  userId: "u1",
  goal: "side_income",
  goalDetails: "",
  skills: ["Baking"],
  interests: [],
  weeklyHours: 10,
  budget: { amount: 200, currency: "EUR" },
  businessPreference: "local",
  hasIdea: true,
  ideaDescription: "Sourdough",
  countryCode: "DE",
  currentBusinessId: null,
  onboardingCompletedAt: "2026-10-29T00:00:00Z",
  updatedAt: "2026-10-29T00:00:00Z",
}

const business: Business = {
  id: "b1",
  name: "Crab Bakery",
  description: "",
  origin: "own_idea",
  status: "active",
  operatingMode: "ceo",
  createdAt: "",
  updatedAt: "",
}

describe("computeJourney", () => {
  it("starts at the founder profile", () => {
    const journey = computeJourney({ profile: null, business: null })
    expect(journey[0]).toMatchObject({ id: "founder_profile", status: "current" })
    expect(journey.slice(1).every((m) => m.status === "upcoming")).toBe(true)
  })

  it("marks tracked milestones done from real state", () => {
    const journey = computeJourney({ profile, business })
    expect(journey.map((m) => [m.id, m.status])).toEqual([
      ["founder_profile", "done"],
      ["business_workspace", "done"],
      ["opportunity_validated", "current"],
      ["business_plan", "upcoming"],
      ["first_customer", "upcoming"],
      ["first_revenue", "upcoming"],
      ["cofounder_mode", "upcoming"],
    ])
  })

  it("never marks untracked milestones as done", () => {
    const journey = computeJourney({ profile, business })
    for (const m of journey.filter((m) => !m.tracked && m.id !== "cofounder_mode")) {
      expect(m.status).not.toBe("done")
    }
  })

  it("treats an onboarding-incomplete profile as not done", () => {
    const journey = computeJourney({
      profile: { ...profile, onboardingCompletedAt: null },
      business: null,
    })
    expect(journey[0]!.status).toBe("current")
  })
})

describe("getNextAction", () => {
  it("asks new founders to complete onboarding first", () => {
    expect(getNextAction({ profile: null, business: null })).toMatchObject({
      id: "complete_profile",
      href: "/onboarding",
    })
  })

  it("suggests a workspace for an existing idea", () => {
    expect(getNextAction({ profile, business: null })).toMatchObject({
      id: "create_business",
      title: "Set up a workspace for your idea",
    })
  })

  it("is honest that discovery isn't available yet for founders without an idea", () => {
    const action = getNextAction({
      profile: { ...profile, hasIdea: false },
      business: null,
    })
    expect(action.reason).toMatch(/still in development/)
  })

  it("asks for skipped constraints once a workspace exists", () => {
    const action = getNextAction({
      profile: { ...profile, weeklyHours: null, budget: null },
      business,
    })
    expect(action).toMatchObject({
      id: "fill_profile_gaps",
      title: "Add your weekly time and starting budget",
    })
  })

  it("does not link to features that don't exist yet", () => {
    const action = getNextAction({ profile, business })
    expect(action).toMatchObject({ id: "await_planning", href: null, cta: null })
  })

  it("is always rule-based in Stage 1", () => {
    expect(getNextAction({ profile, business }).source).toBe("rules")
  })
})

describe("getDailyAction", () => {
  const t = (
    id: string,
    priority: "low" | "medium" | "high",
    dueDate: string | null,
    status = "todo"
  ) => ({
    id,
    title: id,
    priority,
    dueDate,
    status,
  })
  const today = "2026-10-29"

  it("returns null without open tasks", () => {
    expect(getDailyAction([t("a", "high", null, "done")], today)).toBeNull()
  })

  it("puts overdue work first", () => {
    expect(
      getDailyAction(
        [t("soon", "high", "2026-10-30"), t("late", "low", "2026-10-20")],
        today
      )?.taskId
    ).toBe("late")
  })

  it("then tasks due today, then in-progress work", () => {
    expect(
      getDailyAction([t("later", "high", null), t("today", "low", today)], today)?.taskId
    ).toBe("today")
    expect(
      getDailyAction(
        [t("high", "high", null), t("wip", "low", null, "in_progress")],
        today
      )?.taskId
    ).toBe("wip")
  })

  it("otherwise picks the highest priority, earliest due", () => {
    expect(
      getDailyAction(
        [
          t("m", "medium", "2026-11-01"),
          t("h2", "high", "2026-11-05"),
          t("h1", "high", "2026-11-02"),
        ],
        today
      )?.taskId
    ).toBe("h1")
  })
})
