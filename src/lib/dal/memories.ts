import "server-only"

import { requireUser } from "@/lib/dal/auth"
import { getCurrentBusiness } from "@/lib/dal/business"
import { DataAccessError } from "@/lib/dal/errors"
import { oneOf } from "@/lib/dal/workspace"
import { MEMORY_CATEGORIES } from "@/lib/nanocrab-ceo/proposals"
import type { FounderMemory, MemoryCategory } from "@/lib/nanocrab-ceo/types"
import type { Tables } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

const COLUMNS = "id, category, content, source, business_id, updated_at" as const
type Row = Pick<
  Tables<"founder_memories">,
  "id" | "category" | "content" | "source" | "business_id" | "updated_at"
>

export const MAX_MEMORIES = 200

function toMemory(r: Row): FounderMemory {
  return {
    id: r.id,
    category: oneOf(MEMORY_CATEGORIES, r.category, "fact"),
    content: r.content,
    source: r.source === "ai_suggested" ? "ai_suggested" : "user",
    businessId: r.business_id,
    updatedAt: r.updated_at,
  }
}

/**
 * The founder's memories: general ones plus those for their current business.
 * Only the signed-in founder's rows (explicit filter + RLS).
 */
export async function listMemories(): Promise<FounderMemory[]> {
  const user = await requireUser()
  const business = await getCurrentBusiness()
  const supabase = await createClient()
  let query = supabase
    .from("founder_memories")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(MAX_MEMORIES)
  query = business
    ? query.or(`business_id.is.null,business_id.eq.${business.id}`)
    : query.is("business_id", null)
  const { data, error } = await query
  if (error) throw new DataAccessError("list memories", error)
  return data.map(toMemory)
}

export async function createMemory(input: {
  category: MemoryCategory
  content: string
  source?: "user" | "ai_suggested"
  forCurrentBusiness?: boolean
}): Promise<void> {
  const user = await requireUser()
  const supabase = await createClient()
  const { count, error: countError } = await supabase
    .from("founder_memories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
  if (countError) throw new DataAccessError("count memories", countError)
  if ((count ?? 0) >= MAX_MEMORIES) throw new MemoryLimitError()

  const business = input.forCurrentBusiness === false ? null : await getCurrentBusiness()
  const { error } = await supabase.from("founder_memories").insert({
    user_id: user.id,
    business_id: business?.id ?? null,
    category: input.category,
    content: input.content,
    source: input.source ?? "user",
  })
  if (error) throw new DataAccessError("create memory", error)
}

export class MemoryLimitError extends Error {
  constructor() {
    super(`You can save up to ${MAX_MEMORIES} memories. Delete some to add more.`)
    this.name = "MemoryLimitError"
  }
}

export async function updateMemory(
  id: string,
  input: { category: MemoryCategory; content: string }
): Promise<void> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("founder_memories")
    .update({ category: input.category, content: input.content })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
  if (error) throw new DataAccessError("update memory", error)
  if (data.length !== 1) throw new DataAccessError("update memory: not found")
}

export async function deleteMemory(id: string): Promise<void> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("founder_memories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
  if (error) throw new DataAccessError("delete memory", error)
  if (data.length !== 1) throw new DataAccessError("delete memory: not found")
}
