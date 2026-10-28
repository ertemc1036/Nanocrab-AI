import "server-only"

import { z } from "zod"

/**
 * Server-only AI configuration. The API key is never returned from here —
 * only whether one is present — so it can't leak into props or logs.
 *
 * Default model: gpt-5.4-mini, a small, cost-efficient model recognized by the
 * official OpenAI SDK. Prices default to its published per-token rates and
 * must be kept in sync with https://openai.com/api/pricing — spending limits
 * are computed from them.
 */
const num = (
  fallback: number,
  opts: { min?: number; max?: number; int?: boolean } = {}
) => {
  let schema = z.coerce.number()
  if (opts.int) schema = schema.int()
  if (opts.min !== undefined) schema = schema.min(opts.min)
  if (opts.max !== undefined) schema = schema.max(opts.max)
  return z.preprocess(
    (v) => (v === undefined || v === "" ? undefined : v),
    schema.default(fallback)
  )
}

const configSchema = z.object({
  model: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._:-]{1,100}$/, "Invalid OPENAI_MODEL")
    .default("gpt-5.4-mini"),
  priceInputPer1M: num(0.75, { min: 0, max: 1000 }),
  priceOutputPer1M: num(4.5, { min: 0, max: 1000 }),
  maxOutputTokens: num(1200, { min: 64, max: 16000, int: true }),
  maxInputChars: num(4000, { min: 100, max: 20000, int: true }),
  contextTokenBudget: num(6000, { min: 500, max: 100000, int: true }),
  requestsPerMinute: num(5, { min: 1, max: 30, int: true }),
  requestsPerDay: num(100, { min: 1, max: 500, int: true }),
  monthlySpendLimitUsd: num(2, { min: 0, max: 50 }),
  globalDailySpendLimitUsd: num(10, { min: 0, max: 100000 }),
  requestTimeoutMs: num(60000, { min: 5000, max: 300000, int: true }),
})

export type AIConfig = z.infer<typeof configSchema> & { hasApiKey: boolean }

export function getAIConfig(): AIConfig {
  const parsed = configSchema.safeParse({
    model: process.env.OPENAI_MODEL || undefined,
    priceInputPer1M: process.env.OPENAI_PRICE_INPUT_PER_1M,
    priceOutputPer1M: process.env.OPENAI_PRICE_OUTPUT_PER_1M,
    maxOutputTokens: process.env.AI_MAX_OUTPUT_TOKENS,
    maxInputChars: process.env.AI_MAX_INPUT_CHARS,
    contextTokenBudget: process.env.AI_CONTEXT_TOKEN_BUDGET,
    requestsPerMinute: process.env.AI_REQUESTS_PER_MINUTE,
    requestsPerDay: process.env.AI_REQUESTS_PER_DAY,
    monthlySpendLimitUsd: process.env.AI_MONTHLY_SPEND_LIMIT_USD,
    globalDailySpendLimitUsd: process.env.AI_GLOBAL_DAILY_SPEND_LIMIT_USD,
    requestTimeoutMs: process.env.AI_REQUEST_TIMEOUT_MS,
  })
  if (!parsed.success) {
    // Misconfiguration is reported by variable name only, never by value.
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ")
    throw new Error(`Invalid AI configuration: ${fields}`)
  }
  return { ...parsed.data, hasApiKey: Boolean(process.env.OPENAI_API_KEY?.trim()) }
}

export function isAIConfigured(): boolean {
  try {
    return getAIConfig().hasApiKey
  } catch {
    return false
  }
}

/** Reads the API key. Only the provider may call this. */
export function readOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error("OPENAI_API_KEY is not set")
  return key
}
