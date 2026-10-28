import "server-only"

import { DataAccessError } from "@/lib/dal/errors"
import { requireWorkspaceScope, type WorkspaceScope } from "@/lib/dal/workspace"

export type ConversationSummary = { id: string; title: string; lastMessageAt: string }
export type StoredMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  status: "complete" | "error" | "cancelled"
  createdAt: string
}

export async function listConversations(
  scope?: WorkspaceScope
): Promise<ConversationSummary[]> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, last_message_at")
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .order("last_message_at", { ascending: false })
    .limit(100)
  if (error) throw new DataAccessError("list conversations", error)
  return data.map((c) => ({ id: c.id, title: c.title, lastMessageAt: c.last_message_at }))
}

/** A conversation of the current business owned by the founder, or null. */
export async function getConversation(
  id: string,
  scope?: WorkspaceScope
): Promise<ConversationSummary | null> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, last_message_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .maybeSingle()
  if (error) throw new DataAccessError("get conversation", error)
  return data
    ? { id: data.id, title: data.title, lastMessageAt: data.last_message_at }
    : null
}

export async function listMessages(
  conversationId: string,
  scope?: WorkspaceScope,
  limit = 200
): Promise<StoredMessage[]> {
  const { user, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, status, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new DataAccessError("list messages", error)
  return data.reverse().map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    status:
      m.status === "error"
        ? "error"
        : m.status === "cancelled"
          ? "cancelled"
          : "complete",
    createdAt: m.created_at,
  }))
}

export async function createConversation(
  title: string,
  scope: WorkspaceScope
): Promise<string> {
  const { user, business, supabase } = scope
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, business_id: business.id, title })
    .select("id")
    .single()
  if (error) throw new DataAccessError("create conversation", error)
  return data.id
}

export async function addMessage(
  conversationId: string,
  message: {
    role: "user" | "assistant"
    content: string
    status?: "complete" | "error" | "cancelled"
    model?: string
    inputTokens?: number
    outputTokens?: number
  },
  scope: WorkspaceScope
): Promise<string> {
  const { user, supabase } = scope
  const { data, error } = await supabase
    .from("messages")
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      status: message.status ?? "complete",
      model: message.model ?? null,
      input_tokens: message.inputTokens ?? null,
      output_tokens: message.outputTokens ?? null,
    })
    .select("id")
    .single()
  if (error) throw new DataAccessError("add message", error)
  return data.id
}

export async function touchConversation(
  id: string,
  scope: WorkspaceScope
): Promise<void> {
  const { user, supabase } = scope
  const { error } = await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new DataAccessError("touch conversation", error)
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data, error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .select("id")
  if (error) throw new DataAccessError("rename conversation", error)
  if (data.length !== 1) throw new DataAccessError("rename conversation: not found")
}

export async function deleteConversation(id: string): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data, error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .select("id")
  if (error) throw new DataAccessError("delete conversation", error)
  if (data.length !== 1) throw new DataAccessError("delete conversation: not found")
}
