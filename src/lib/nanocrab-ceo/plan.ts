import { z } from "zod"

/** Business plan structure. Section order is the display order. */
export const PLAN_SECTIONS = [
  {
    key: "concept",
    label: "Business concept",
    hint: "What the business is, in two or three sentences.",
  },
  {
    key: "problem",
    label: "Problem",
    hint: "The specific problem your customers have today.",
  },
  { key: "solution", label: "Solution", hint: "How you solve it, and why that works." },
  {
    key: "targetCustomers",
    label: "Target customers",
    hint: "Who exactly buys, and how to reach them.",
  },
  {
    key: "revenueModel",
    label: "Revenue model",
    hint: "What you charge, how, and how often.",
  },
  {
    key: "competition",
    label: "Competitive positioning",
    hint: "Alternatives customers use and why you're different.",
  },
  {
    key: "marketing",
    label: "Marketing strategy",
    hint: "How customers will find out about you.",
  },
  {
    key: "startupCosts",
    label: "Startup costs",
    hint: "What you need to spend before the first sale.",
  },
  { key: "risks", label: "Risks", hint: "What could go wrong and how you'll reduce it." },
  {
    key: "firstCustomers",
    label: "First customer acquisition plan",
    hint: "Concrete steps to land your first paying customers.",
  },
] as const

export type PlanSectionKey = (typeof PLAN_SECTIONS)[number]["key"]
export const PLAN_SECTION_KEYS = PLAN_SECTIONS.map((s) => s.key) as [
  PlanSectionKey,
  ...PlanSectionKey[],
]

export const SECTION_MAX = 4000

const sectionText = z.string().trim().max(SECTION_MAX)

/** Stored plan content (business_plans.sections). */
export const planSectionsSchema = z.object({
  concept: sectionText,
  problem: sectionText,
  solution: sectionText,
  targetCustomers: sectionText,
  revenueModel: sectionText,
  competition: sectionText,
  marketing: sectionText,
  startupCosts: sectionText,
  risks: sectionText,
  firstCustomers: sectionText,
  /** Claims in the plan that still need validating. */
  assumptions: z.array(z.string().trim().min(1).max(300)).max(15),
})

export type PlanSections = z.infer<typeof planSectionsSchema>

export const EMPTY_PLAN: PlanSections = {
  concept: "",
  problem: "",
  solution: "",
  targetCustomers: "",
  revenueModel: "",
  competition: "",
  marketing: "",
  startupCosts: "",
  risks: "",
  firstCustomers: "",
  assumptions: [],
}

/** Parses stored JSON defensively; unknown/invalid content becomes empty. */
export function parseStoredPlan(value: unknown): PlanSections {
  const result = planSectionsSchema.safeParse({
    ...EMPTY_PLAN,
    ...(isObject(value) ? value : {}),
  })
  return result.success ? result.data : EMPTY_PLAN
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

/** What the model must return when generating a plan. */
export const generatedPlanSchema = planSectionsSchema

/** What the model must return when improving one section. */
export const improvedSectionSchema = z.object({
  content: z.string().trim().min(1).max(SECTION_MAX),
  rationale: z.string().trim().max(600),
  assumptions: z.array(z.string().trim().min(1).max(300)).max(5),
})
export type ImprovedSection = z.infer<typeof improvedSectionSchema>
