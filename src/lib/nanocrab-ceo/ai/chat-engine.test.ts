import { describe, expect, it, vi } from "vitest"

import { AIError } from "@/lib/ai/errors"
import type { AIProvider, StreamEvent } from "@/lib/ai/types"

import { runChatTurn, type ChatEvent, type ChatSink } from "./chat-engine"

/** Test double: replays scripted events. Never used outside tests. */
function scriptedProvider(events: StreamEvent[], failAfter?: AIError): AIProvider {
  return {
    id: "test",
    async *streamResponse() {
      for (const e of events) yield e
      if (failAfter) throw failAfter
    },
    generateStructured: vi.fn(),
  }
}

function makeSink() {
  const calls: string[] = []
  const sink: ChatSink = {
    saveAssistantMessage: vi.fn(async (content, status) => {
      calls.push(`message:${status}:${content}`)
      return "msg-1"
    }),
    saveProposals: vi.fn(
      async (items) =>
        items.map((i: { kind: string; payload: unknown }, n: number) => ({
          id: `p${n}`,
          kind: i.kind,
          payload: i.payload,
          status: "pending" as const,
          createdAt: "",
          conversationId: "c1",
        })) as never
    ),
    finishRequest: vi.fn(async (status, usage, cost) => {
      calls.push(`finish:${status}:${usage.inputTokens}/${usage.outputTokens}:${cost}`)
    }),
  }
  return { sink, calls }
}

async function collect(gen: AsyncGenerator<ChatEvent>) {
  const out: ChatEvent[] = []
  for await (const e of gen) out.push(e)
  return out
}

const base = {
  model: "m",
  instructions: "i",
  messages: [{ role: "user" as const, content: "help" }],
  maxOutputTokens: 100,
  prices: { priceInputPer1M: 1, priceOutputPer1M: 2 },
}

const usageDone: StreamEvent = {
  type: "done",
  usage: { inputTokens: 1000, outputTokens: 500 },
  incomplete: false,
}

describe("runChatTurn", () => {
  it("streams text, saves the reply and settles usage with real cost", async () => {
    const { sink, calls } = makeSink()
    const events = await collect(
      runChatTurn({
        ...base,
        provider: scriptedProvider([
          { type: "text", delta: "Hello " },
          { type: "text", delta: "founder" },
          usageDone,
        ]),
        signal: new AbortController().signal,
        sink,
      })
    )
    expect(events).toEqual([
      { type: "delta", text: "Hello " },
      { type: "delta", text: "founder" },
      { type: "done", messageId: "msg-1", status: "complete" },
    ])
    // 1000 * 1 + 500 * 2 = 2000 micro-dollars
    expect(calls).toEqual([
      "message:complete:Hello founder",
      "finish:completed:1000/500:2000",
    ])
  })

  it("turns valid tool calls into pending proposals and drops invalid ones", async () => {
    const { sink } = makeSink()
    const events = await collect(
      runChatTurn({
        ...base,
        provider: scriptedProvider([
          { type: "text", delta: "Here's a plan." },
          {
            type: "tool_call",
            name: "propose_task",
            arguments: JSON.stringify({
              title: "Interview 5 cafés",
              description: "",
              priority: "high",
              dueInDays: 7,
              rationale: "Validate demand",
            }),
          },
          { type: "tool_call", name: "propose_task", arguments: '{"title": ""}' },
          { type: "tool_call", name: "delete_everything", arguments: "{}" },
          { type: "tool_call", name: "propose_memory", arguments: "not json" },
          usageDone,
        ]),
        signal: new AbortController().signal,
        sink,
      })
    )
    const proposals = events.find((e) => e.type === "proposals")
    expect(proposals).toMatchObject({
      proposals: [
        { kind: "task", payload: { title: "Interview 5 cafés", priority: "high" } },
      ],
    })
    expect(sink.saveProposals).toHaveBeenCalledTimes(1)
  })

  it("saves partial text as cancelled when the founder stops the reply", async () => {
    const { sink, calls } = makeSink()
    const controller = new AbortController()
    const provider: AIProvider = {
      id: "test",
      async *streamResponse() {
        yield { type: "text", delta: "Partial" }
        controller.abort()
        throw new AIError("cancelled")
      },
      generateStructured: vi.fn(),
    }
    const events = await collect(
      runChatTurn({ ...base, provider, signal: controller.signal, sink })
    )
    expect(events.at(-1)).toEqual({
      type: "done",
      messageId: "msg-1",
      status: "cancelled",
    })
    expect(calls).toEqual(["message:cancelled:Partial", "finish:cancelled:0/0:0"])
  })

  it("reports a timeout as an error, not as a user cancel", async () => {
    const { sink, calls } = makeSink()
    const events = await collect(
      runChatTurn({
        ...base,
        provider: scriptedProvider([], new AIError("cancelled")),
        signal: AbortSignal.abort(),
        timedOut: () => true,
        sink,
      })
    )
    expect(events).toEqual([
      { type: "error", message: new AIError("timeout").userMessage },
    ])
    expect(calls).toEqual(["message:error:", "finish:failed:0/0:0"])
  })

  it("never fakes a reply when the provider fails", async () => {
    const { sink, calls } = makeSink()
    const events = await collect(
      runChatTurn({
        ...base,
        provider: scriptedProvider(
          [{ type: "text", delta: "Hal" }],
          new AIError("provider_busy")
        ),
        signal: new AbortController().signal,
        sink,
      })
    )
    expect(events.at(-1)).toEqual({
      type: "error",
      message: new AIError("provider_busy").userMessage,
    })
    expect(calls).toEqual(["message:error:Hal", "finish:failed:0/0:0"])
    expect(sink.saveProposals).not.toHaveBeenCalled()
  })

  it("treats an empty response as invalid output", async () => {
    const { sink } = makeSink()
    const events = await collect(
      runChatTurn({
        ...base,
        provider: scriptedProvider([usageDone]),
        signal: new AbortController().signal,
        sink,
      })
    )
    expect(events).toEqual([
      { type: "error", message: new AIError("invalid_output").userMessage },
    ])
  })

  it("caps the number of proposals per reply", async () => {
    const { sink } = makeSink()
    const call = {
      type: "tool_call" as const,
      name: "recommend_next_action",
      arguments: JSON.stringify({ title: "Do X", reason: "" }),
    }
    await collect(
      runChatTurn({
        ...base,
        provider: scriptedProvider([
          { type: "text", delta: "ok" },
          ...Array(9).fill(call),
          usageDone,
        ]),
        signal: new AbortController().signal,
        sink,
      })
    )
    expect(vi.mocked(sink.saveProposals).mock.calls[0]![0]).toHaveLength(5)
  })
})
