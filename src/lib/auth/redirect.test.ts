import { describe, expect, it } from "vitest"

import { DEFAULT_AUTHENTICATED_PATH, safeRedirectPath } from "./redirect"

describe("safeRedirectPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/agents/123?tab=memory#top", "/agents/123?tab=memory#top"],
    ["/reset-password", "/reset-password"],
  ])("allows same-origin path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected)
  })

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "///evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "",
    "/" + "a".repeat(600),
  ])("rejects unsafe target %j", (input) => {
    expect(safeRedirectPath(input)).toBe(DEFAULT_AUTHENTICATED_PATH)
  })

  it("rejects non-string values", () => {
    expect(safeRedirectPath(null)).toBe(DEFAULT_AUTHENTICATED_PATH)
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_AUTHENTICATED_PATH)
    expect(safeRedirectPath(["/x"])).toBe(DEFAULT_AUTHENTICATED_PATH)
  })

  it("uses a custom fallback", () => {
    expect(safeRedirectPath("//x", "/login")).toBe("/login")
  })
})
