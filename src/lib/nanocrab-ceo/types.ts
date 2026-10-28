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
