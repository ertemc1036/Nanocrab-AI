import "server-only"

import { createHash } from "node:crypto"

import type { z } from "zod"

import { getAIConfig } from "@/lib/ai/config"
import { costMicros, estimateTokens, reservedCostMicros } from "@/lib/ai/cost"
import { AIError } from "@/lib/ai/errors"
import { getAIProvider } from "@/lib/ai/registry"
import { beginAIRequest, finishAIRequest, type AIRequestKind } from "@/lib/dal/ai-usage"
import type { WorkspaceScope } from "@/lib/dal/workspace"

import { buildWorkspaceContext } from "./context"
import { buildInstructions } from "./instructions"
import { loadWorkspaceSnapshot } from "./snapshot"

/**
 * One structured AI call with the founder's workspace as context. Enforces
 * configuration, database-backed limits, a timeout and Zod validation, and
 * always settles the usage ledger. Throws AIError on any failure.
 */
export async function runStructuredTask<T>(params: {
  scope: WorkspaceScope
  kind: AIRequestKind
  task: string
  schema: z.ZodType<T>
  schemaName: string
  maxOutputTokens: number
}): Promise<T> {
  const config = getAIConfig()
  if (!config.hasApiKey) throw new AIError("not_configured")
  const maxOutputTokens = Math.min(params.maxOutputTokens, 16000)

  const snapshot = await loadWorkspaceSnapshot(params.scope)
  const context = buildWorkspaceContext(snapshot, config.contextTokenBudget)
  const instructions = `${buildInstructions({
    mode: params.scope.business.operatingMode,
    style: snapshot.profile.leadershipStyle,
    language: snapshot.profile.preferredLanguage,
    today: snapshot.today,
  })}\n\n${context.text}`
  const estimatedInput = estimateTokens(instructions) + estimateTokens(params.task)

  const requestId = await beginAIRequest(params.scope, config, {
    kind: params.kind,
    reservedCostMicros: reservedCostMicros(estimatedInput, maxOutputTokens, config),
  })

  try {
    const { data, usage } = await getAIProvider().generateStructured({
      model: config.model,
      instructions,
      messages: [{ role: "user", content: params.task }],
      schema: params.schema,
      schemaName: params.schemaName,
      maxOutputTokens,
      signal: AbortSignal.timeout(config.requestTimeoutMs),
      safetyIdentifier: createHash("sha256")
        .update(`nanocrab:${params.scope.user.id}`)
        .digest("hex"),
    })
    await finishAIRequest(params.scope, requestId, {
      status: "completed",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costMicros: costMicros(usage.inputTokens, usage.outputTokens, config),
    })
    return data
  } catch (error) {
    await finishAIRequest(params.scope, requestId, {
      status: "failed",
      inputTokens: 0,
      outputTokens: 0,
      costMicros: 0,
    })
    if (error instanceof AIError)
      throw error.kind === "cancelled" ? new AIError("timeout") : error
    throw new AIError("provider_error")
  }
}
