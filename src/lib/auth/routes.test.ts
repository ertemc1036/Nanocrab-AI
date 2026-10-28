import { describe, expect, it } from "vitest"

import { appNav } from "@/config/navigation"

import { isGuestOnlyPath, isProtectedPath } from "./routes"

describe("route classification", () => {
  it("protects every app navigation destination", () => {
    for (const item of appNav) {
      expect(isProtectedPath(item.href), item.href).toBe(true)
      expect(isProtectedPath(`${item.href}/nested`), item.href).toBe(true)
    }
  })

  it("protects the password reset page", () => {
    expect(isProtectedPath("/reset-password")).toBe(true)
  })

  it.each([
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/auth/confirm",
    "/agents-public",
  ])("does not protect public path %s", (path) => {
    expect(isProtectedPath(path)).toBe(false)
  })

  it("identifies guest-only pages", () => {
    expect(isGuestOnlyPath("/login")).toBe(true)
    expect(isGuestOnlyPath("/signup")).toBe(true)
    expect(isGuestOnlyPath("/forgot-password")).toBe(true)
    expect(isGuestOnlyPath("/dashboard")).toBe(false)
    expect(isGuestOnlyPath("/reset-password")).toBe(false)
  })
})
