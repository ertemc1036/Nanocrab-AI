import "server-only"

import { DataAccessError } from "@/lib/dal/errors"
import { requireWorkspaceScope, type WorkspaceScope } from "@/lib/dal/workspace"
import {
  validateProposalPayload,
  type Proposal,
  type ProposalKind,
  type ProposalPayload,
} from "@/lib/nanocrab-ceo/proposals"
import type { Json } from "@/lib/supabase/database.types"

const KINDS: ProposalKind[] = [
  "task",
  "milestone",
  "memory",
  "plan_section",
  "next_action",
]
const COLUMNS = "id, kind, payload, status, created_at, conversation_id" as const

function toProposal(r: {
  id: string
  kind: string
  payload: Json
  status: string
  created_at: string
  conversation_id: string | null
}): Proposal | null {
  const kind = KINDS.find((k) => k === r.kind)
  if (!kind) return null
  const payload = validateProposalPayload(kind, r.payload)
  if (!payload) return null
  return {
    id: r.id,
    kind,
    payload,
    status:
      r.status === "accepted"
        ? "accepted"
        : r.status === "dismissed"
          ? "dismissed"
          : "pending",
    createdAt: r.created_at,
    conversationId: r.conversation_id,
  } as Proposal
}

export async function createProposals(
  items: { kind: ProposalKind; payload: ProposalPayload<ProposalKind> }[],
  conversationId: string | null,
  scope: WorkspaceScope
): Promise<Proposal[]> {
  if (items.length === 0) return []
  const { user, business, supabase } = scope
  const { data, error } = await supabase
    .from("ai_proposals")
    .insert(
      items.map((i) => ({
        user_id: user.id,
        business_id: business.id,
        conversation_id: conversationId,
        kind: i.kind,
        payload: i.payload as unknown as Json,
      }))
    )
    .select(COLUMNS)
  if (error) throw new DataAccessError("create proposals", error)
  return data.map(toProposal).filter((p): p is Proposal => p !== null)
}

export async function listProposals(filter: {
  status?: "pending"
  kinds?: ProposalKind[]
  conversationId?: string
  limit?: number
}): Promise<Proposal[]> {
  const { user, business, supabase } = await requireWorkspaceScope()
  let query = supabase
    .from("ai_proposals")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 50)
  if (filter.status) query = query.eq("status", filter.status)
  if (filter.kinds) query = query.in("kind", filter.kinds)
  if (filter.conversationId) query = query.eq("conversation_id", filter.conversationId)
  const { data, error } = await query
  if (error) throw new DataAccessError("list proposals", error)
  return data.map(toProposal).filter((p): p is Proposal => p !== null)
}

/** Loads one pending proposal owned by the founder for the current business. */
export async function getPendingProposal(
  id: string,
  scope: WorkspaceScope
): Promise<Proposal | null> {
  const { user, business, supabase } = scope
  const { data, error } = await supabase
    .from("ai_proposals")
    .select(COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .eq("status", "pending")
    .maybeSingle()
  if (error) throw new DataAccessError("get proposal", error)
  return data ? toProposal(data) : null
}

/** Marks a pending proposal resolved. Returns false if it was already resolved. */
export async function resolveProposal(
  id: string,
  status: "accepted" | "dismissed",
  scope: WorkspaceScope
): Promise<boolean> {
  const { user, business, supabase } = scope
  const { data, error } = await supabase
    .from("ai_proposals")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .eq("status", "pending")
    .select("id")
  if (error) throw new DataAccessError("resolve proposal", error)
  return data.length === 1
}
