import { beforeEach, describe, expect, it, vi } from "vitest"

const order = vi.hoisted(() => [] as string[])

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {
    order.push("connection")
  }),
}))
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => {
    order.push("cookies")
    return { getAll: () => [], set: () => {} }
  }),
}))
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => {
    order.push("createServerClient")
    return {}
  }),
}))

import { createClient, SupabaseNotConfiguredError } from "./server"

beforeEach(() => {
  order.length = 0
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co")
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "sb_publishable_0123456789abcdefghij"
  )
})

describe("createClient", () => {
  it("waits for a real request before any Supabase code can read the clock", async () => {
    await createClient()
    expect(order).toEqual(["connection", "cookies", "createServerClient"])
  })

  it("fails clearly when Supabase isn't configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    await expect(createClient()).rejects.toBeInstanceOf(SupabaseNotConfiguredError)
  })
})
