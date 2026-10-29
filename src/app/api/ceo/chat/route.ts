import { createHash } from "node:crypto"

import { z } from "zod"

import { getAIConfig } from "@/lib/ai/config"
import { estimateTokens, reservedCostMicros } from "@/lib/ai/cost"
import { AIError } from "@/lib/ai/errors"
import { getAIProvider } from "@/lib/ai/registry"
import { beginAIRequest, finishAIRequest } from "@/lib/dal/ai-usage"
import { getCurrentUser } from "@/lib/dal/auth"
import {
  addMessage,
  createConversation,
  getConversation,
  listMessages,
  touchConversation,
} from "@/lib/dal/chat"
import { createProposals } from "@/lib/dal/proposals"
import { getWorkspaceScope } from "@/lib/dal/workspace"
import { runChatTurn, type ChatEvent } from "@/lib/nanocrab-ceo/ai/chat-engine"
import { buildWorkspaceContext, selectHistory } from "@/lib/nanocrab-ceo/ai/context"
import { buildInstructions } from "@/lib/nanocrab-ceo/ai/instructions"
import { loadWorkspaceSnapshot } from "@/lib/nanocrab-ceo/ai/snapshot"

const bodySchema = z.object({
  conversationId: z.uuid().nullable(),
  message: z.string(),
})

function json(status: number, body: { error: string; code: string }) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } })
}

/** Blocks cross-site requests: the Origin must match this app's host. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/**
 * POST /api/ceo/chat — streams one AI CEO reply as NDJSON events.
 * Every step runs as the signed-in founder; the database enforces ownership
 * (RLS) and AI usage limits (begin_ai_request).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json(403, { error: "Forbidden", code: "forbidden" })
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json(415, { error: "Expected JSON", code: "bad_request" })
  }

  const user = await getCurrentUser()
  if (!user) return json(401, { error: "Please log in again.", code: "unauthenticated" })

  const config = getAIConfig()
  if (!config.hasApiKey) {
    return json(503, {
      error: new AIError("not_configured").userMessage,
      code: "not_configured",
    })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return json(400, { error: "Invalid request.", code: "bad_request" })
  }
  const message = body.message.trim()
  if (!message) return json(400, { error: "Write a message first.", code: "bad_request" })
  if (message.length > config.maxInputChars) {
    return json(400, {
      error: `Messages can be up to ${config.maxInputChars} characters.`,
      code: "too_long",
    })
  }

  const scope = await getWorkspaceScope()
  if (!scope)
    return json(409, {
      error: new AIError("no_business").userMessage,
      code: "no_business",
    })

  const existing = body.conversationId
    ? await getConversation(body.conversationId, scope)
    : null
  if (body.conversationId && !existing) {
    return json(404, { error: "Conversation not found.", code: "not_found" })
  }

  // Context: workspace (budgeted) + recent history (budgeted) + new message.
  const snapshot = await loadWorkspaceSnapshot(scope)
  const context = buildWorkspaceContext(snapshot, config.contextTokenBudget)
  const instructions = `${buildInstructions({
    mode: scope.business.operatingMode,
    style: snapshot.profile.leadershipStyle,
    language: snapshot.profile.preferredLanguage,
    today: snapshot.today,
  })}\n\n${context.text}`
  const history = existing
    ? selectHistory(
        (await listMessages(existing.id, scope, 60)).filter(
          (m) => m.status === "complete" && m.content.trim()
        ),
        config.contextTokenBudget
      )
    : []
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ]
  const estimatedInput =
    estimateTokens(instructions) +
    messages.reduce((n, m) => n + estimateTokens(m.content) + 4, 0)

  let requestId: number
  try {
    requestId = await beginAIRequest(scope, config, {
      kind: "chat_completion",
      reservedCostMicros: reservedCostMicros(
        estimatedInput,
        config.maxOutputTokens,
        config
      ),
      conversationId: existing?.id ?? null,
    })
  } catch (error) {
    if (error instanceof AIError)
      return json(429, { error: error.userMessage, code: error.kind })
    throw error
  }

  const conversationId =
    existing?.id ?? (await createConversation(titleFrom(message), scope))
  await addMessage(conversationId, { role: "user", content: message }, scope)

  const timeout = AbortSignal.timeout(config.requestTimeoutMs)
  const signal = AbortSignal.any([request.signal, timeout])
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        } catch {
          // The browser went away; persistence below still completes.
        }
      }
      send({ type: "start", conversationId })
      try {
        for await (const event of runChatTurn({
          provider: getAIProvider(),
          model: config.model,
          instructions,
          messages,
          maxOutputTokens: config.maxOutputTokens,
          signal,
          timedOut: () => timeout.aborted,
          safetyIdentifier: createHash("sha256")
            .update(`nanocrab:${user.id}`)
            .digest("hex"),
          prices: config,
          sink: {
            saveAssistantMessage: (content, status, usage) =>
              addMessage(
                conversationId,
                {
                  role: "assistant",
                  content,
                  status,
                  model: config.model,
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                },
                scope
              ),
            saveProposals: (items) => createProposals(items, conversationId, scope),
            finishRequest: (status, usage, cost) =>
              finishAIRequest(scope, requestId, {
                status,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                costMicros: cost,
              }),
          },
        })) {
          send(event)
        }
        await touchConversation(conversationId, scope)
      } catch (error) {
        console.error("[api/ceo/chat] turn failed", {
          name: error instanceof Error ? error.name : "unknown",
        })
        send({
          type: "error",
          message: "Something went wrong saving this reply. Please try again.",
        })
      } finally {
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  })
}

function titleFrom(message: string): string {
  const line = message.replace(/\s+/g, " ").trim()
  return line.length > 60 ? `${line.slice(0, 57)}…` : line
}
