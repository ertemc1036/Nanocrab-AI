import { z } from "zod"

import { PLAN_SECTION_KEYS, SECTION_MAX } from "./plan"

/**
 * Typed application commands the AI can *propose*. Nothing is applied until
 * the founder approves it; on approval the payload is validated again and
 * executed server-side with ownership checks (src/app/(app)/proposals).
 *
 * Schemas use required + nullable fields (no optionals) so they work with
 * OpenAI strict function calling.
 */
export const PRIORITIES = ["low", "medium", "high"] as const
export const MEMORY_CATEGORIES = [
  "fact",
  "goal",
  "decision",
  "preference",
  "challenge",
  "progress",
] as const

export const taskProposalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  priority: z.enum(PRIORITIES),
  dueInDays: z.number().int().min(0).max(365).nullable(),
  rationale: z.string().trim().max(600),
})

export const milestoneProposalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000),
  targetInDays: z.number().int().min(1).max(730).nullable(),
  rationale: z.string().trim().max(600),
})

export const memoryProposalSchema = z.object({
  category: z.enum(MEMORY_CATEGORIES),
  content: z.string().trim().min(1).max(1000),
  rationale: z.string().trim().max(600),
})

export const planSectionProposalSchema = z.object({
  section: z.enum(PLAN_SECTION_KEYS),
  content: z.string().trim().min(1).max(SECTION_MAX),
  rationale: z.string().trim().max(600),
})

export const nextActionProposalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  reason: z.string().trim().max(600),
})

export const PROPOSAL_SCHEMAS = {
  task: taskProposalSchema,
  milestone: milestoneProposalSchema,
  memory: memoryProposalSchema,
  plan_section: planSectionProposalSchema,
  next_action: nextActionProposalSchema,
} as const

export type ProposalKind = keyof typeof PROPOSAL_SCHEMAS
export type ProposalPayload<K extends ProposalKind> = z.infer<
  (typeof PROPOSAL_SCHEMAS)[K]
>

export type Proposal = {
  [K in ProposalKind]: {
    id: string
    kind: K
    payload: ProposalPayload<K>
    status: "pending" | "accepted" | "dismissed"
    createdAt: string
    conversationId: string | null
  }
}[ProposalKind]

/** Tools exposed to the model, mapped to proposal kinds. */
export const PROPOSAL_TOOLS: {
  name: string
  kind: ProposalKind
  description: string
}[] = [
  {
    name: "propose_task",
    kind: "task",
    description:
      "Propose ONE concrete task for the founder's task list. The founder must approve it. Use for clear, actionable next steps (max 3 per reply).",
  },
  {
    name: "propose_milestone",
    kind: "milestone",
    description:
      "Propose a measurable business milestone (e.g. 'First 3 paying customers'). The founder must approve it.",
  },
  {
    name: "propose_memory",
    kind: "memory",
    description:
      "Propose saving something the FOUNDER stated or decided (a fact, goal, decision, preference, challenge or progress) to long-term memory. Never propose your own assumptions as facts. The founder must approve it.",
  },
  {
    name: "propose_plan_update",
    kind: "plan_section",
    description:
      "Propose replacing ONE business plan section with improved text. Mark unvalidated claims as assumptions in the text. The founder must approve it.",
  },
  {
    name: "recommend_next_action",
    kind: "next_action",
    description:
      "Recommend the single most important next action for the founder right now, with the reason.",
  },
]

export function toolKind(name: string): ProposalKind | null {
  return PROPOSAL_TOOLS.find((t) => t.name === name)?.kind ?? null
}

/** Validates a tool call from the model. Invalid calls are dropped, not repaired. */
export function parseProposalCall(
  name: string,
  rawArguments: string
): { kind: ProposalKind; payload: ProposalPayload<ProposalKind> } | null {
  const kind = toolKind(name)
  if (!kind) return null
  let json: unknown
  try {
    json = JSON.parse(rawArguments)
  } catch {
    return null
  }
  const parsed = PROPOSAL_SCHEMAS[kind].safeParse(json)
  return parsed.success ? { kind, payload: parsed.data } : null
}

/** Re-validates a stored proposal payload before executing it. */
export function validateProposalPayload<K extends ProposalKind>(
  kind: K,
  payload: unknown
): ProposalPayload<K> | null {
  const parsed = PROPOSAL_SCHEMAS[kind].safeParse(payload)
  return parsed.success ? (parsed.data as ProposalPayload<K>) : null
}

export const MAX_PROPOSALS_PER_REPLY = 5
