import "server-only"

import type { AIConfig } from "@/lib/ai/config"
import { usdToMicros } from "@/lib/ai/cost"
import { AIError, limitError } from "@/lib/ai/errors"
import { DataAccessError } from "@/lib/dal/errors"
import type { WorkspaceScope } from "@/lib/dal/workspace"

export type AIRequestKind = "chat_completion" | "plan_generation" | "plan_section"

/**
 * Reserves an AI request in the ledger. The database enforces the per-user
 * rate and spending limits atomically; throws AIError when a limit is hit.
 */
export async function beginAIRequest(
  scope: WorkspaceScope,
  config: AIConfig,
  opts: {
    kind: AIRequestKind
    reservedCostMicros: number
    conversationId?: string | null
  }
): Promise<number> {
  const { data, error } = await scope.supabase.rpc("begin_ai_request", {
    p_kind: opts.kind,
    p_provider: "openai",
    p_model: config.model,
    p_reserved_cost_micros: opts.reservedCostMicros,
    p_business_id: scope.business.id,
    // SQL null is valid here; generated arg types don't model nullable params.
    p_conversation_id: (opts.conversationId ?? null) as string,
    p_limit_per_minute: config.requestsPerMinute,
    p_limit_per_day: config.requestsPerDay,
    p_monthly_limit_micros: usdToMicros(config.monthlySpendLimitUsd),
    p_global_daily_limit_micros: usdToMicros(config.globalDailySpendLimitUsd),
  })
  if (error) throw new DataAccessError("begin AI request", error)
  const row = data[0]
  if (!row) throw new DataAccessError("begin AI request: no result")
  if (!row.allowed || row.request_id === null) throw limitError(row.reason)
  return row.request_id
}

export async function finishAIRequest(
  scope: WorkspaceScope,
  requestId: number,
  result: {
    status: "completed" | "failed" | "cancelled"
    inputTokens: number
    outputTokens: number
    costMicros: number
  }
): Promise<void> {
  const { error } = await scope.supabase.rpc("finish_ai_request", {
    p_request_id: requestId,
    p_status: result.status,
    p_input_tokens: result.inputTokens,
    p_output_tokens: result.outputTokens,
    p_cost_micros: result.costMicros,
  })
  if (error) throw new DataAccessError("finish AI request", error)
}

/** This month's AI usage for the signed-in founder (for the UI). */
export async function getMonthlyUsage(scope: WorkspaceScope): Promise<{
  requests: number
  spendMicros: number
}> {
  const now = new Date()
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString()
  const { data, error } = await scope.supabase
    .from("usage_events")
    .select("reserved_cost_micros, cost_micros")
    .eq("user_id", scope.user.id)
    .gte("created_at", monthStart)
    .limit(5000)
  if (error) throw new DataAccessError("get monthly usage", error)
  return {
    requests: data.length,
    spendMicros: data.reduce(
      (sum, r) => sum + Math.max(r.reserved_cost_micros, r.cost_micros),
      0
    ),
  }
}

export { AIError }
