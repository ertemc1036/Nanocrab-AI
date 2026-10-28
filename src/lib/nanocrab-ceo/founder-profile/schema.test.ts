import { describe, expect, it } from "vitest"

import { founderProfileInputSchema } from "./schema"

describe("founderProfileInputSchema", () => {
  it("only requires a goal and defaults everything else to unknown", () => {
    expect(founderProfileInputSchema.parse({ goal: "explore" })).toEqual({
      goal: "explore",
      goalDetails: "",
      skills: [],
      interests: [],
      weeklyHours: null,
      budget: null,
      businessPreference: null,
      hasIdea: null,
      ideaDescription: "",
      countryCode: null,
    })
  })

  it("rejects a missing or unknown goal", () => {
    expect(founderProfileInputSchema.safeParse({}).success).toBe(false)
    expect(founderProfileInputSchema.safeParse({ goal: "get_rich" }).success).toBe(false)
  })

  it("trims and de-duplicates skills case-insensitively", () => {
    const result = founderProfileInputSchema.parse({
      goal: "freelance",
      skills: [" Design ", "design", "Writing"],
    })
    expect(result.skills).toEqual(["Design", "Writing"])
  })

  it("limits the number and length of tags", () => {
    const many = Array.from({ length: 21 }, (_, i) => `s${i}`)
    expect(
      founderProfileInputSchema.safeParse({ goal: "explore", skills: many }).success
    ).toBe(false)
    expect(
      founderProfileInputSchema.safeParse({
        goal: "explore",
        interests: ["x".repeat(61)],
      }).success
    ).toBe(false)
  })

  it("validates weekly hours", () => {
    for (const weeklyHours of [0, 101, 2.5]) {
      expect(
        founderProfileInputSchema.safeParse({ goal: "explore", weeklyHours }).success
      ).toBe(false)
    }
  })

  it("normalizes the budget and validates the currency", () => {
    const ok = founderProfileInputSchema.parse({
      goal: "explore",
      budget: { amount: 99.999, currency: "eur" },
    })
    expect(ok.budget).toEqual({ amount: 100, currency: "EUR" })
    expect(
      founderProfileInputSchema.safeParse({
        goal: "explore",
        budget: { amount: 10, currency: "XYZ1" },
      }).success
    ).toBe(false)
    expect(
      founderProfileInputSchema.safeParse({
        goal: "explore",
        budget: { amount: -5, currency: "USD" },
      }).success
    ).toBe(false)
  })

  it("accepts a zero budget as a real answer", () => {
    const result = founderProfileInputSchema.parse({
      goal: "explore",
      budget: { amount: 0, currency: "USD" },
    })
    expect(result.budget).toEqual({ amount: 0, currency: "USD" })
  })

  it("validates the country code", () => {
    expect(
      founderProfileInputSchema.parse({ goal: "explore", countryCode: "de" }).countryCode
    ).toBe("DE")
    for (const countryCode of ["XX", "EU", "USA"]) {
      expect(
        founderProfileInputSchema.safeParse({ goal: "explore", countryCode }).success
      ).toBe(false)
    }
  })

  it("drops an idea description when the founder has no idea", () => {
    const result = founderProfileInputSchema.parse({
      goal: "explore",
      hasIdea: false,
      ideaDescription: "leftover text",
    })
    expect(result.ideaDescription).toBe("")
  })
})
