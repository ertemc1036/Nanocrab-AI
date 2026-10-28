import "server-only"

import { cache } from "react"

import { requireUser } from "@/lib/dal/auth"
import { DataAccessError } from "@/lib/dal/errors"
import { isCountryCode } from "@/lib/nanocrab-ceo/founder-profile/countries"
import {
  BUSINESS_PREFERENCE_VALUES,
  GOAL_VALUES,
} from "@/lib/nanocrab-ceo/founder-profile/options"
import type { FounderProfileData } from "@/lib/nanocrab-ceo/founder-profile/schema"
import type { FounderProfile } from "@/lib/nanocrab-ceo/types"
import type { Tables } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

const COLUMNS =
  "user_id, goal, goal_details, skills, interests, weekly_hours, budget_amount, budget_currency, business_preference, has_idea, idea_description, country_code, current_business_id, onboarding_completed_at, updated_at" as const

type Row = Pick<
  Tables<"founder_profiles">,
  | "user_id"
  | "goal"
  | "goal_details"
  | "skills"
  | "interests"
  | "weekly_hours"
  | "budget_amount"
  | "budget_currency"
  | "business_preference"
  | "has_idea"
  | "idea_description"
  | "country_code"
  | "current_business_id"
  | "onboarding_completed_at"
  | "updated_at"
>

function includes<T extends string>(
  values: readonly T[],
  value: string | null
): value is T {
  return value !== null && (values as readonly string[]).includes(value)
}

export function toFounderProfile(row: Row): FounderProfile {
  if (!includes(GOAL_VALUES, row.goal))
    throw new DataAccessError(`unexpected goal "${row.goal}"`)
  return {
    userId: row.user_id,
    goal: row.goal,
    goalDetails: row.goal_details,
    skills: row.skills,
    interests: row.interests,
    weeklyHours: row.weekly_hours,
    budget:
      row.budget_amount !== null && row.budget_currency !== null
        ? { amount: Number(row.budget_amount), currency: row.budget_currency }
        : null,
    businessPreference: includes(BUSINESS_PREFERENCE_VALUES, row.business_preference)
      ? row.business_preference
      : null,
    hasIdea: row.has_idea,
    ideaDescription: row.idea_description,
    countryCode:
      row.country_code && isCountryCode(row.country_code) ? row.country_code : null,
    currentBusinessId: row.current_business_id,
    onboardingCompletedAt: row.onboarding_completed_at,
    updatedAt: row.updated_at,
  }
}

/** The signed-in founder's profile, or null before onboarding. Memoized per request. */
export const getMyFounderProfile = cache(async (): Promise<FounderProfile | null> => {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("founder_profiles")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw new DataAccessError("get founder profile", error)
  return data ? toFounderProfile(data) : null
})

/** Creates or updates the signed-in founder's onboarding answers. */
export async function saveMyFounderProfile(input: FounderProfileData): Promise<void> {
  const user = await requireUser()
  const supabase = await createClient()

  const values = {
    goal: input.goal,
    goal_details: input.goalDetails,
    skills: input.skills,
    interests: input.interests,
    weekly_hours: input.weeklyHours,
    budget_amount: input.budget?.amount ?? null,
    budget_currency: input.budget?.currency ?? null,
    business_preference: input.businessPreference,
    has_idea: input.hasIdea,
    idea_description: input.ideaDescription,
    country_code: input.countryCode,
  }

  const existing = await getMyFounderProfile()
  if (existing) {
    const { data, error } = await supabase
      .from("founder_profiles")
      .update({
        ...values,
        onboarding_completed_at:
          existing.onboardingCompletedAt ?? new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("user_id")
    if (error) throw new DataAccessError("update founder profile", error)
    if (data?.length !== 1)
      throw new DataAccessError("update founder profile: no row updated")
    return
  }

  const { error } = await supabase.from("founder_profiles").insert({
    ...values,
    user_id: user.id,
    onboarding_completed_at: new Date().toISOString(),
  })
  if (error) throw new DataAccessError("create founder profile", error)
}
