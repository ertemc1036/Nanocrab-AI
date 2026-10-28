import { afterEach, describe, expect, it, vi } from "vitest"

import { getSiteUrl, getSupabaseEnv, isSupabaseConfigured } from "./env"

afterEach(() => {
  vi.unstubAllEnvs()
})

const KEY = "sb_publishable_0123456789abcdefghij"

describe("getSupabaseEnv", () => {
  it("returns null when not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    expect(getSupabaseEnv()).toBeNull()
    expect(isSupabaseConfigured()).toBe(false)
  })

  it("parses a valid configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", KEY)
    expect(getSupabaseEnv()).toEqual({
      url: "https://abc.supabase.co",
      publishableKey: KEY,
    })
  })

  it("accepts the legacy anon key name", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", KEY)
    expect(getSupabaseEnv()?.publishableKey).toBe(KEY)
  })

  it("rejects a malformed URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "abc.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", KEY)
    expect(getSupabaseEnv()).toBeNull()
  })
})

describe("getSiteUrl", () => {
  it("strips trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://nanocrab.ai/")
    expect(getSiteUrl()).toBe("https://nanocrab.ai")
  })
})
