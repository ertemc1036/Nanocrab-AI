import { describe, expect, it } from "vitest"

import {
  assumptionsInputSchema,
  evidenceInputSchema,
  isIsoDate,
  revenueInputSchema,
  taskInputSchema,
} from "./workspace"

describe("workspace validation", () => {
  it("validates real calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true)
    expect(isIsoDate("2026-02-30")).toBe(false)
    expect(isIsoDate("31/10/2026")).toBe(false)
  })

  it("normalizes tasks and treats an empty due date as none", () => {
    expect(
      taskInputSchema.parse({
        title: " Call ",
        description: "",
        priority: "high",
        dueDate: "",
      })
    ).toEqual({ title: "Call", description: "", priority: "high", dueDate: null })
    expect(
      taskInputSchema.safeParse({
        title: "",
        description: "",
        priority: "high",
        dueDate: "",
      }).success
    ).toBe(false)
  })

  it("rounds revenue to cents and rejects zero or negative amounts", () => {
    const base = {
      currency: "eur",
      saleDate: "2026-10-01",
      item: "Box",
      customerReference: "",
      evidenceNote: "",
      evidenceUrl: "",
    }
    expect(revenueInputSchema.parse({ ...base, amount: "19.999" })).toMatchObject({
      amount: 20,
      currency: "EUR",
      evidenceUrl: null,
    })
    expect(revenueInputSchema.safeParse({ ...base, amount: "0" }).success).toBe(false)
    expect(revenueInputSchema.safeParse({ ...base, amount: "-5" }).success).toBe(false)
  })

  it("only accepts https evidence links", () => {
    expect(
      evidenceInputSchema.safeParse({
        evidenceNote: "",
        evidenceUrl: "javascript:alert(1)",
      }).success
    ).toBe(false)
    expect(
      evidenceInputSchema.safeParse({ evidenceNote: "", evidenceUrl: "http://x.com" })
        .success
    ).toBe(false)
    expect(
      evidenceInputSchema.safeParse({
        evidenceNote: "",
        evidenceUrl: "https://dashboard.stripe.com/p/1",
      }).success
    ).toBe(true)
  })

  it("requires some evidence to verify revenue", () => {
    expect(
      evidenceInputSchema.safeParse({ evidenceNote: "", evidenceUrl: "" }).success
    ).toBe(false)
    expect(
      evidenceInputSchema.safeParse({ evidenceNote: "PayPal txn 8XY", evidenceUrl: "" })
        .success
    ).toBe(true)
  })

  it("parses assumptions one per line, stripping bullets", () => {
    expect(
      assumptionsInputSchema.parse("- Offices pay €30\n\n• 10 cafés nearby\n")
    ).toEqual(["Offices pay €30", "10 cafés nearby"])
  })
})
