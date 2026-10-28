import { costMicros, type Prices } from "@/lib/ai/cost"
import { AIError } from "@/lib/ai/errors"
import type { AIProvider, ChatMessage, TokenUsage } from "@/lib/ai/types"

import {
  MAX_PROPOSALS_PER_REPLY,
  parseProposalCall,
  PROPOSAL_SCHEMAS,
  PROPOSAL_TOOLS,
  type Proposal,
  type ProposalKind,
  type ProposalPayload,
} from "../proposals"

/** Events streamed to the browser (NDJSON, one per line). */
export type ChatEvent =
  | { type: "start"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "proposals"; proposals: Proposal[] }
  | { type: "done"; messageId: string | null; status: "complete" | "cancelled" }
  | { type: "error"; message: string }

export type ChatSink = {
  saveAssistantMessage(
    content: string,
    status: "complete" | "error" | "cancelled",
    usage: TokenUsage
  ): Promise<string>
  saveProposals(
    items: { kind: ProposalKind; payload: ProposalPayload<ProposalKind> }[]
  ): Promise<Proposal[]>
  finishRequest(
    status: "completed" | "failed" | "cancelled",
    usage: TokenUsage,
    costMicros: number
  ): Promise<void>
}

export const CHAT_TOOLS = PROPOSAL_TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: PROPOSAL_SCHEMAS[t.kind],
}))

/**
 * Runs one AI CEO reply: streams text, collects proposal tool calls,
 * validates them, persists the reply and proposals, and settles the usage
 * ledger — whether the reply completes, is cancelled or fails. Never invents
 * a reply: if the model returns nothing usable, the turn is an error.
 */
export async function* runChatTurn(params: {
  provider: AIProvider
  model: string
  instructions: string
  messages: ChatMessage[]
  maxOutputTokens: number
  signal: AbortSignal
  safetyIdentifier?: string
  prices: Prices
  sink: ChatSink
  /** True when the abort came from the server timeout, not the user. */
  timedOut?: () => boolean
}): AsyncGenerator<ChatEvent> {
  const { sink } = params
  let text = ""
  const toolCalls: { name: string; arguments: string }[] = []
  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
  let failure: AIError | null = null

  try {
    for await (const event of params.provider.streamResponse({
      model: params.model,
      instructions: params.instructions,
      messages: params.messages,
      tools: CHAT_TOOLS,
      maxOutputTokens: params.maxOutputTokens,
      signal: params.signal,
      safetyIdentifier: params.safetyIdentifier,
    })) {
      if (event.type === "text") {
        text += event.delta
        yield { type: "delta", text: event.delta }
      } else if (event.type === "tool_call") {
        toolCalls.push({ name: event.name, arguments: event.arguments })
      } else {
        usage = event.usage
      }
    }
  } catch (error) {
    failure = error instanceof AIError ? error : new AIError("provider_error")
  }
  if (!failure && params.signal.aborted) failure = new AIError("cancelled")
  if (failure?.kind === "cancelled" && params.timedOut?.())
    failure = new AIError("timeout")

  const cost = costMicros(usage.inputTokens, usage.outputTokens, params.prices)

  if (failure?.kind === "cancelled") {
    const messageId = text.trim()
      ? await sink.saveAssistantMessage(text, "cancelled", usage)
      : null
    await sink.finishRequest("cancelled", usage, cost)
    yield { type: "done", messageId, status: "cancelled" }
    return
  }

  const proposals = failure
    ? []
    : toolCalls
        .map((c) => parseProposalCall(c.name, c.arguments))
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .slice(0, MAX_PROPOSALS_PER_REPLY)

  if (!failure && !text.trim() && proposals.length === 0) {
    failure = new AIError("invalid_output")
  }

  if (failure) {
    await sink.saveAssistantMessage(text, "error", usage)
    await sink.finishRequest("failed", usage, cost)
    yield { type: "error", message: failure.userMessage }
    return
  }

  const messageId = await sink.saveAssistantMessage(text, "complete", usage)
  const saved = await sink.saveProposals(proposals)
  await sink.finishRequest("completed", usage, cost)
  if (saved.length) yield { type: "proposals", proposals: saved }
  yield { type: "done", messageId, status: "complete" }
}
