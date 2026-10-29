import { beforeEach, describe, expect, it, vi } from "vitest"

import { AIError } from "@/lib/ai/errors"

const m = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getWorkspaceScope: vi.fn(),
  getConversation: vi.fn(),
  loadWorkspaceSnapshot: vi.fn(),
  beginAIRequest: vi.fn(),
  getAIProvider: vi.fn(),
  buildInstructions: vi.fn(() => "INSTRUCTIONS"),
}))

vi.mock("@/lib/dal/auth", () => ({ getCurrentUser: m.getCurrentUser }))
vi.mock("@/lib/dal/workspace", () => ({ getWorkspaceScope: m.getWorkspaceScope }))
vi.mock("@/lib/dal/chat", () => ({
  getConversation: m.getConversation,
  addMessage: vi.fn(),
  createConversation: vi.fn(),
  listMessages: vi.fn(async () => []),
  touchConversation: vi.fn(),
}))
vi.mock("@/lib/dal/proposals", () => ({ createProposals: vi.fn() }))
vi.mock("@/lib/dal/ai-usage", () => ({
  beginAIRequest: m.beginAIRequest,
  finishAIRequest: vi.fn(),
}))
vi.mock("@/lib/ai/registry", () => ({ getAIProvider: m.getAIProvider }))
vi.mock("@/lib/ai/config", () => ({
  getAIConfig: () => ({
    hasApiKey: true,
    maxInputChars: 4000,
    contextTokenBudget: 6000,
    maxOutputTokens: 1000,
    priceInputPer1M: 1,
    priceOutputPer1M: 1,
  }),
}))
vi.mock("@/lib/nanocrab-ceo/ai/snapshot", () => ({
  loadWorkspaceSnapshot: m.loadWorkspaceSnapshot,
}))
vi.mock("@/lib/nanocrab-ceo/ai/context", () => ({
  buildWorkspaceContext: () => ({ text: "CONTEXT" }),
  selectHistory: (x: unknown[]) => x,
}))
vi.mock("@/lib/nanocrab-ceo/ai/instructions", () => ({
  buildInstructions: m.buildInstructions,
}))

import { POST } from "./route"

const CONVERSATION = "11111111-1111-4111-8111-111111111111"

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://app.test/api/ceo/chat", {
    method: "POST",
    headers: {
      host: "app.test",
      origin: "http://app.test",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  m.getCurrentUser.mockResolvedValue({ id: "user-a", email: "a@example.com" })
  m.getWorkspaceScope.mockResolvedValue({
    user: { id: "user-a" },
    business: { id: "biz-a", operatingMode: "ceo" },
  })
  m.loadWorkspaceSnapshot.mockResolvedValue({
    profile: { leadershipStyle: "executive", preferredLanguage: null },
    today: "2026-10-29",
  })
})

describe("POST /api/ceo/chat — permissions (scenario 10)", () => {
  it("rejects cross-site requests before reading any data", async () => {
    const res = await POST(
      request({ conversationId: null, message: "hi" }, { origin: "https://evil.test" })
    )
    expect(res.status).toBe(403)
    expect(m.getCurrentUser).not.toHaveBeenCalled()
  })

  it("rejects signed-out requests", async () => {
    m.getCurrentUser.mockResolvedValueOnce(null)
    const res = await POST(request({ conversationId: null, message: "hi" }))
    expect(res.status).toBe(401)
    expect(m.getWorkspaceScope).not.toHaveBeenCalled()
  })

  it("returns 404 for another account's conversation and loads nothing else", async () => {
    // RLS hides the other founder's row, so the owned-scope lookup finds nothing.
    m.getConversation.mockResolvedValueOnce(null)
    const res = await POST(request({ conversationId: CONVERSATION, message: "show me" }))
    expect(res.status).toBe(404)
    expect(m.getConversation).toHaveBeenCalledWith(
      CONVERSATION,
      expect.objectContaining({ user: { id: "user-a" } })
    )
    expect(m.loadWorkspaceSnapshot).not.toHaveBeenCalled()
    expect(m.beginAIRequest).not.toHaveBeenCalled()
    expect(m.getAIProvider).not.toHaveBeenCalled()
  })

  it("passes the founder's stored leadership style to the server-side instructions", async () => {
    // Stop at the usage limit so no AI call is made.
    m.beginAIRequest.mockRejectedValueOnce(new AIError("rate_limited"))
    const res = await POST(
      request({ conversationId: null, message: "Was soll ich heute tun?" })
    )
    expect(res.status).toBe(429)
    expect(m.buildInstructions).toHaveBeenCalledWith({
      mode: "ceo",
      style: "executive",
      language: null,
      today: "2026-10-29",
    })
    expect(m.getAIProvider).not.toHaveBeenCalled()
  })
})
