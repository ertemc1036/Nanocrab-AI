import { describe, expect, it } from "vitest"

import { appNav, isNavItemActive } from "./navigation"

describe("isNavItemActive", () => {
  it("matches the exact route", () => {
    expect(isNavItemActive("/agents", "/agents")).toBe(true)
  })

  it("matches nested routes", () => {
    expect(isNavItemActive("/agents/abc/edit", "/agents")).toBe(true)
  })

  it("ignores trailing slashes", () => {
    expect(isNavItemActive("/memory/", "/memory")).toBe(true)
  })

  it("does not match siblings that share a prefix", () => {
    expect(isNavItemActive("/agents-archive", "/agents")).toBe(false)
  })

  it("does not match unrelated routes", () => {
    expect(isNavItemActive("/settings", "/dashboard")).toBe(false)
  })
})

describe("appNav", () => {
  it("has unique hrefs", () => {
    const hrefs = appNav.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
