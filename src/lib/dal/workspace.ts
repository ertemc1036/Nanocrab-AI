import "server-only"

import { requireUser } from "@/lib/dal/auth"
import { DataAccessError } from "@/lib/dal/errors"
import { createClient } from "@/lib/supabase/server"

export type WorkspaceSummary = {
  agents: number
  conversations: number
  memories: number
  /** Successful AI responses recorded this calendar month (UTC). */
  aiResponsesThisMonth: number
}

/** Counts of the signed-in user's own data. RLS + explicit user filter. */
export async function getWorkspaceSummary(): Promise<WorkspaceSummary> {
  const user = await requireUser()
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString()

  const [agents, conversations, memories, usage] = await Promise.all([
    supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("agent_memories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "chat_completion")
      .gte("created_at", monthStart),
  ])

  for (const [name, result] of Object.entries({
    agents,
    conversations,
    memories,
    usage,
  })) {
    if (result.error) throw new DataAccessError(`count ${name}`, result.error)
  }

  return {
    agents: agents.count ?? 0,
    conversations: conversations.count ?? 0,
    memories: memories.count ?? 0,
    aiResponsesThisMonth: usage.count ?? 0,
  }
}
