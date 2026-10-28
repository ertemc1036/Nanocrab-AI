import { afterEach, describe, expect, it, vi } from "vitest"

import { getAIConfig, isAIConfigured } from "./config"

afterEach(() => vi.unstubAllEnvs())

describe("getAIConfig", () => {
  it("uses safe defaults and never exposes the key", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-secret")
    vi.stubEnv("OPENAI_MODEL", "")
    const config = getAIConfig()
    expect(config).toMatchObject({
      model: "gpt-5.4-mini",
      hasApiKey: true,
      maxOutputTokens: 1200,
    })
    expect(JSON.stringify(config)).not.toContain("sk-test-secret")
  })

  it("reports not configured without a key", () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    expect(isAIConfigured()).toBe(false)
  })

  it("rejects limits beyond the hard ceilings, naming only the variable", () => {
    vi.stubEnv("AI_REQUESTS_PER_MINUTE", "1000")
    expect(() => getAIConfig()).toThrow("Invalid AI configuration: requestsPerMinute")
  })

  it("rejects a malformed model name", () => {
    vi.stubEnv("OPENAI_MODEL", "gpt 5; drop")
    expect(() => getAIConfig()).toThrow(/model/)
  })
})
