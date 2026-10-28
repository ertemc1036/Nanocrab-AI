/**
 * Token and cost arithmetic. Costs are integer micro-dollars (1e-6 USD) so
 * they can be summed exactly in the database.
 */

/** Conservative token estimate (~4 characters per token for typical text). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export type Prices = { priceInputPer1M: number; priceOutputPer1M: number }

export function costMicros(
  inputTokens: number,
  outputTokens: number,
  prices: Prices
): number {
  return Math.ceil(
    inputTokens * prices.priceInputPer1M + outputTokens * prices.priceOutputPer1M
  )
}

/**
 * Worst-case cost reserved before a request: estimated input plus a 25%
 * margin for tokenizer differences and tool schemas, and the full output cap.
 */
export function reservedCostMicros(
  estimatedInputTokens: number,
  maxOutputTokens: number,
  prices: Prices
): number {
  return costMicros(Math.ceil(estimatedInputTokens * 1.25) + 500, maxOutputTokens, prices)
}

export const usdToMicros = (usd: number) => Math.round(usd * 1_000_000)
