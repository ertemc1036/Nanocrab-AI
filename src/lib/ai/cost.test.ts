import { describe, expect, it } from "vitest"

import { costMicros, estimateTokens, reservedCostMicros, usdToMicros } from "./cost"

const prices = { priceInputPer1M: 0.75, priceOutputPer1M: 4.5 }

describe("cost", () => {
  it("computes micro-dollars from per-1M prices", () => {
    // 1M input tokens at $0.75 = 750,000 micro-dollars
    expect(costMicros(1_000_000, 0, prices)).toBe(750_000)
    expect(costMicros(1000, 1000, prices)).toBe(5250)
  })

  it("reserves at least the full output cap plus a margin on input", () => {
    expect(reservedCostMicros(1000, 1200, prices)).toBeGreaterThan(
      costMicros(1000, 1200, prices)
    )
  })

  it("estimates tokens conservatively", () => {
    expect(estimateTokens("abcd")).toBe(1)
    expect(estimateTokens("abcde")).toBe(2)
  })

  it("converts dollars to micros", () => {
    expect(usdToMicros(2)).toBe(2_000_000)
  })
})
