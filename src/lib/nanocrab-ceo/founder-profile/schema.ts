import { z } from "zod"

import { isCountryCode } from "./countries"
import { BUSINESS_PREFERENCE_VALUES, GOAL_VALUES, LIMITS } from "./options"

function isCurrencyCode(code: string): boolean {
  try {
    return Intl.supportedValuesOf("currency").includes(code)
  } catch {
    return /^[A-Z]{3}$/.test(code)
  }
}

/** Trimmed, de-duplicated (case-insensitive) list of short tags. */
const tagListSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(LIMITS.tag, `Keep each entry under ${LIMITS.tag} characters.`)
  )
  .max(LIMITS.tags, `Add at most ${LIMITS.tags} entries.`)
  .transform((tags) => {
    const seen = new Set<string>()
    return tags.filter((tag) => {
      const key = tag.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })
  .refine((tags) => tags.join("").length <= LIMITS.tagsTotal, "That list is too long.")

/**
 * Founder onboarding answers. Only `goal` is required; every other answer may
 * be skipped (null / empty) and must then be treated as unknown — never
 * inferred or invented.
 */
export const founderProfileInputSchema = z
  .object({
    goal: z.enum(GOAL_VALUES, { error: "Choose what you want to achieve." }),
    goalDetails: z.string().trim().max(LIMITS.goalDetails).default(""),
    skills: tagListSchema.default([]),
    interests: tagListSchema.default([]),
    weeklyHours: z
      .number()
      .int("Use whole hours.")
      .min(1, "Enter at least 1 hour.")
      .max(LIMITS.weeklyHoursMax, `Enter at most ${LIMITS.weeklyHoursMax} hours.`)
      .nullable()
      .default(null),
    budget: z
      .object({
        amount: z
          .number()
          .min(0, "Budget can't be negative.")
          .max(LIMITS.budgetMax, "That budget is higher than we support.")
          .transform((n) => Math.round(n * 100) / 100),
        currency: z
          .string()
          .trim()
          .toUpperCase()
          .refine(isCurrencyCode, "Choose a valid currency."),
      })
      .nullable()
      .default(null),
    businessPreference: z.enum(BUSINESS_PREFERENCE_VALUES).nullable().default(null),
    hasIdea: z.boolean().nullable().default(null),
    ideaDescription: z.string().trim().max(LIMITS.ideaDescription).default(""),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine(isCountryCode, "Choose a valid country.")
      .nullable()
      .default(null),
  })
  .transform((data) => ({
    ...data,
    // An idea description only makes sense when the founder has an idea.
    ideaDescription: data.hasIdea === true ? data.ideaDescription : "",
  }))

export type FounderProfileInput = z.input<typeof founderProfileInputSchema>
export type FounderProfileData = z.output<typeof founderProfileInputSchema>
