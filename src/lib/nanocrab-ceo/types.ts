import type { CountryCode } from "./founder-profile/countries"
import type { BusinessPreference, Goal } from "./founder-profile/options"

export type OperatingMode = "ceo" | "cofounder"

/** A founder's onboarding answers. Null/empty means unknown (skipped). */
export type FounderProfile = {
  userId: string
  goal: Goal
  goalDetails: string
  skills: string[]
  interests: string[]
  weeklyHours: number | null
  budget: { amount: number; currency: string } | null
  businessPreference: BusinessPreference | null
  hasIdea: boolean | null
  ideaDescription: string
  countryCode: CountryCode | null
  currentBusinessId: string | null
  onboardingCompletedAt: string | null
  updatedAt: string
}

export type Business = {
  id: string
  name: string
  description: string
  origin: "own_idea" | "opportunity"
  status: "active" | "archived"
  operatingMode: OperatingMode
  createdAt: string
  updatedAt: string
}

export type TaskStatus = "todo" | "in_progress" | "done"
export type Priority = "low" | "medium" | "high"

export type BusinessTask = {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  dueDate: string | null
  source: "user" | "ai"
  completedAt: string | null
  createdAt: string
}

export type BusinessMilestone = {
  id: string
  title: string
  description: string
  status: "planned" | "achieved"
  targetDate: string | null
  source: "user" | "ai"
  achievedAt: string | null
}

export type MemoryCategory =
  "fact" | "goal" | "decision" | "preference" | "challenge" | "progress"

export type FounderMemory = {
  id: string
  category: MemoryCategory
  content: string
  source: "user" | "ai_suggested"
  businessId: string | null
  updatedAt: string
}

export type RevenueStatus = "self_reported" | "verified" | "refunded"

export type RevenueRecord = {
  id: string
  amount: number
  currency: string
  saleDate: string
  item: string
  customerReference: string
  evidenceNote: string
  evidenceUrl: string | null
  status: RevenueStatus
  verifiedAt: string | null
  refundedAt: string | null
}

/** Totals per currency (never converted — no invented exchange rates). */
export type RevenueTotals = {
  currency: string
  verified: number
  selfReported: number
  refunded: number
}[]
