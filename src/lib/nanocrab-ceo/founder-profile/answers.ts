import type { BusinessPreference, Goal } from "./options"

/** Onboarding answers as edited in the UI (null = not answered yet). */
export type OnboardingAnswers = {
  goal: Goal | null
  goalDetails: string
  skills: string[]
  interests: string[]
  weeklyHours: number | null
  budget: { amount: number; currency: string } | null
  businessPreference: BusinessPreference | null
  hasIdea: boolean | null
  ideaDescription: string
  countryCode: string | null
}

export const EMPTY_ANSWERS: OnboardingAnswers = {
  goal: null,
  goalDetails: "",
  skills: [],
  interests: [],
  weeklyHours: null,
  budget: null,
  businessPreference: null,
  hasIdea: null,
  ideaDescription: "",
  countryCode: null,
}
