import "server-only"

import OpenAI, {
  APIConnectionTimeoutError,
  APIUserAbortError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "openai"
import { zodResponsesFunction, zodTextFormat } from "openai/helpers/zod"

import { readOpenAIApiKey } from "@/lib/ai/config"
import { AIError } from "@/lib/ai/errors"
import type {
  AIProvider,
  StreamEvent,
  StreamRequest,
  StructuredRequest,
  TokenUsage,
} from "@/lib/ai/types"

/**
 * OpenAI provider using the Responses API (not the deprecated Assistants API).
 * - store: false — conversations are persisted by NanoCrab, not by OpenAI.
 * - Timeouts and cancellation flow through the AbortSignal.
 * - Errors are mapped to AIError; raw provider messages are logged by status
 *   and type only, never with request content or keys.
 */
export class OpenAIProvider implements AIProvider {
  readonly id = "openai"
  private client: OpenAI | null = null

  private getClient(): OpenAI {
    this.client ??= new OpenAI({ apiKey: readOpenAIApiKey(), maxRetries: 1 })
    return this.client
  }

  async *streamResponse(request: StreamRequest): AsyncIterable<StreamEvent> {
    let stream
    try {
      stream = await this.getClient().responses.create(
        {
          model: request.model,
          instructions: request.instructions,
          input: request.messages.map((m) => ({ role: m.role, content: m.content })),
          tools: request.tools?.map((t) =>
            zodResponsesFunction({
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            })
          ),
          parallel_tool_calls: true,
          max_output_tokens: request.maxOutputTokens,
          store: false,
          safety_identifier: request.safetyIdentifier,
          stream: true,
        },
        { signal: request.signal }
      )
    } catch (error) {
      throw mapError(error)
    }

    try {
      for await (const event of stream) {
        switch (event.type) {
          case "response.output_text.delta":
            yield { type: "text", delta: event.delta }
            break
          case "response.output_item.done":
            if (event.item.type === "function_call") {
              yield {
                type: "tool_call",
                name: event.item.name,
                arguments: event.item.arguments,
              }
            }
            break
          case "response.completed":
          case "response.incomplete":
            yield {
              type: "done",
              usage: toUsage(event.response.usage),
              incomplete: event.type === "response.incomplete",
            }
            return
          case "response.failed":
          case "error":
            logProviderError("stream", event.type)
            throw new AIError("provider_error")
        }
      }
    } catch (error) {
      throw mapError(error)
    }
  }

  async generateStructured<T>(
    request: StructuredRequest<T>
  ): Promise<{ data: T; usage: TokenUsage }> {
    try {
      const response = await this.getClient().responses.parse(
        {
          model: request.model,
          instructions: request.instructions,
          input: request.messages.map((m) => ({ role: m.role, content: m.content })),
          text: { format: zodTextFormat(request.schema, request.schemaName) },
          max_output_tokens: request.maxOutputTokens,
          store: false,
          safety_identifier: request.safetyIdentifier,
        },
        { signal: request.signal }
      )
      // Validate again with our schema: never trust model output unchecked.
      const parsed = request.schema.safeParse(response.output_parsed)
      if (!parsed.success) throw new AIError("invalid_output")
      return { data: parsed.data, usage: toUsage(response.usage) }
    } catch (error) {
      throw mapError(error)
    }
  }
}

function toUsage(
  usage: { input_tokens: number; output_tokens: number } | null | undefined
) {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  }
}

function logProviderError(where: string, kind: string, status?: number) {
  console.error(`[ai:openai] ${where} failed`, { kind, status })
}

function mapError(error: unknown): AIError {
  if (error instanceof AIError) return error
  if (error instanceof APIUserAbortError) return new AIError("cancelled")
  if (error instanceof APIConnectionTimeoutError) return new AIError("timeout")
  if (error instanceof Error && error.name === "TimeoutError")
    return new AIError("timeout")
  if (error instanceof Error && error.name === "AbortError")
    return new AIError("cancelled")
  if (error instanceof RateLimitError) {
    logProviderError("request", "rate_limit", 429)
    return new AIError("provider_busy")
  }
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
    logProviderError("request", "auth", error.status)
    return new AIError("provider_error")
  }
  if (error instanceof OpenAI.APIError) {
    logProviderError("request", error.type ?? "api_error", error.status)
    return new AIError("provider_error")
  }
  logProviderError("request", error instanceof Error ? error.name : "unknown")
  return new AIError("provider_error")
}
