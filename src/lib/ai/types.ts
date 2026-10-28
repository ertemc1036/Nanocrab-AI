import type { z } from "zod"

/** Provider-agnostic AI interfaces. Add providers by implementing AIProvider. */

export type ChatRole = "user" | "assistant"
export type ChatMessage = { role: ChatRole; content: string }

export type TokenUsage = { inputTokens: number; outputTokens: number }

/** A function the model may call. Arguments are validated by the caller. */
export type ToolDefinition = {
  name: string
  description: string
  /** Zod schema for the arguments (converted to strict JSON Schema). */
  parameters: z.ZodType
}

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; name: string; arguments: string }
  | { type: "done"; usage: TokenUsage; incomplete: boolean }

export type StreamRequest = {
  model: string
  instructions: string
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  maxOutputTokens: number
  signal: AbortSignal
  /** Stable, non-identifying end-user id for provider abuse monitoring. */
  safetyIdentifier?: string
}

export type StructuredRequest<T> = Omit<StreamRequest, "tools"> & {
  schema: z.ZodType<T>
  schemaName: string
}

export interface AIProvider {
  readonly id: string
  streamResponse(request: StreamRequest): AsyncIterable<StreamEvent>
  generateStructured<T>(
    request: StructuredRequest<T>
  ): Promise<{ data: T; usage: TokenUsage }>
}
