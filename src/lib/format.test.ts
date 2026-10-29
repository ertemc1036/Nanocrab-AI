import { describe, expect, it } from "vitest"

import { formatMoney } from "./format"

describe("formatMoney", () => {
  it("formats known currencies", () => {
    expect(formatMoney(49, "EUR")).toBe("€49.00")
  })
  it("falls back for unknown codes", () => {
    expect(formatMoney(5, "ZZZ1")).toBe("5.00 ZZZ1")
  })
})
