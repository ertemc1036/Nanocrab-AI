import { z } from "zod"

import { MEMORY_CATEGORIES, PRIORITIES } from "@/lib/nanocrab-ceo/proposals"
import { PLAN_SECTION_KEYS, SECTION_MAX } from "@/lib/nanocrab-ceo/plan"

/** "YYYY-MM-DD" that is a real calendar date. Empty string → null. */
export const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || isIsoDate(v), "Enter a valid date.")

export const requiredDate = z.string().trim().refine(isIsoDate, "Enter a valid date.")

export function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

export const uuidSchema = z.uuid()

export const taskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a task title.")
    .max(200, "Use at most 200 characters."),
  description: z.string().trim().max(2000, "Use at most 2000 characters."),
  priority: z.enum(PRIORITIES, { error: "Choose a priority." }),
  dueDate: optionalDate,
  successCriteria: z
    .string()
    .trim()
    .max(1000, "Use at most 1000 characters.")
    .default(""),
  deliverable: z.string().trim().max(500, "Use at most 500 characters.").default(""),
})

export const taskStatusSchema = z.enum(["todo", "in_progress", "done"])

/** Empty string = unblock. */
export const blockedReasonSchema = z
  .string()
  .trim()
  .max(500, "Use at most 500 characters.")

export const milestoneInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a milestone.")
    .max(160, "Use at most 160 characters."),
  description: z.string().trim().max(1000),
  targetDate: optionalDate,
})

export const memoryInputSchema = z.object({
  category: z.enum(MEMORY_CATEGORIES, { error: "Choose a category." }),
  content: z
    .string()
    .trim()
    .min(1, "Write something to remember.")
    .max(1000, "Use at most 1000 characters."),
})

export const planSectionInputSchema = z.object({
  section: z.enum(PLAN_SECTION_KEYS),
  content: z.string().trim().max(SECTION_MAX, `Use at most ${SECTION_MAX} characters.`),
})

export const assumptionsInputSchema = z
  .string()
  .max(5000)
  .transform((text) =>
    text
      .split("\n")
      .map((l) => l.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean)
  )
  .pipe(
    z
      .array(z.string().max(300, "Keep each assumption under 300 characters."))
      .max(15, "Up to 15 assumptions.")
  )

export const improveSectionInputSchema = z.object({
  section: z.enum(PLAN_SECTION_KEYS),
  instruction: z.string().trim().max(500, "Use at most 500 characters."),
})

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine((c) => {
    try {
      return Intl.supportedValuesOf("currency").includes(c)
    } catch {
      return /^[A-Z]{3}$/.test(c)
    }
  }, "Choose a valid currency.")

const evidenceUrl = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine(
    (v) => v === null || (/^https:\/\//i.test(v) && v.length <= 2048 && URL.canParse(v)),
    "Use a full https:// link."
  )

export const revenueInputSchema = z.object({
  amount: z.coerce
    .number({ error: "Enter an amount." })
    .positive("Amount must be greater than zero.")
    .max(999_999_999_999, "That amount is too large.")
    .transform((n) => Math.round(n * 100) / 100),
  currency: currencyCode,
  saleDate: requiredDate,
  item: z.string().trim().min(1, "What did you sell?").max(200),
  customerReference: z.string().trim().max(120),
  evidenceNote: z.string().trim().max(1000),
  evidenceUrl,
})

export const evidenceInputSchema = z
  .object({ evidenceNote: z.string().trim().max(1000), evidenceUrl })
  .refine((v) => v.evidenceNote !== "" || v.evidenceUrl !== null, {
    message: "Add a payment reference, receipt note or link as evidence.",
    path: ["evidenceNote"],
  })
