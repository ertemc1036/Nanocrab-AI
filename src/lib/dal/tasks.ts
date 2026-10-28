import "server-only"

import { DataAccessError } from "@/lib/dal/errors"
import { oneOf, requireWorkspaceScope, type WorkspaceScope } from "@/lib/dal/workspace"
import type { BusinessTask, Priority, TaskStatus } from "@/lib/nanocrab-ceo/types"
import type { Tables, TablesUpdate } from "@/lib/supabase/database.types"

const COLUMNS =
  "id, title, description, status, priority, due_date, source, completed_at, created_at" as const
type Row = Pick<
  Tables<"business_tasks">,
  | "id"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "due_date"
  | "source"
  | "completed_at"
  | "created_at"
>

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const
export const TASK_PRIORITIES = ["low", "medium", "high"] as const

function toTask(r: Row): BusinessTask {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: oneOf(TASK_STATUSES, r.status, "todo"),
    priority: oneOf(TASK_PRIORITIES, r.priority, "medium"),
    dueDate: r.due_date,
    source: r.source === "ai" ? "ai" : "user",
    completedAt: r.completed_at,
    createdAt: r.created_at,
  }
}

export async function listTasks(scope?: WorkspaceScope): Promise<BusinessTask[]> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("business_tasks")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) throw new DataAccessError("list tasks", error)
  return data.map(toTask)
}

export type TaskInput = {
  title: string
  description: string
  priority: Priority
  dueDate: string | null
}

export async function createTask(
  input: TaskInput & { source?: "user" | "ai" },
  scope?: WorkspaceScope
): Promise<BusinessTask> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("business_tasks")
    .insert({
      user_id: user.id,
      business_id: business.id,
      title: input.title,
      description: input.description,
      priority: input.priority,
      due_date: input.dueDate,
      source: input.source ?? "user",
    })
    .select(COLUMNS)
    .single()
  if (error) throw new DataAccessError("create task", error)
  return toTask(data)
}

export async function updateTask(
  id: string,
  input: Partial<TaskInput> & { status?: TaskStatus }
): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const patch: TablesUpdate<"business_tasks"> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.description !== undefined) patch.description = input.description
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.dueDate !== undefined) patch.due_date = input.dueDate
  if (input.status !== undefined) {
    patch.status = input.status
    patch.completed_at = input.status === "done" ? new Date().toISOString() : null
  }
  const { data, error } = await supabase
    .from("business_tasks")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .select("id")
  if (error) throw new DataAccessError("update task", error)
  if (data.length !== 1) throw new DataAccessError("update task: not found")
}

export async function deleteTask(id: string): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data, error } = await supabase
    .from("business_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .select("id")
  if (error) throw new DataAccessError("delete task", error)
  if (data.length !== 1) throw new DataAccessError("delete task: not found")
}
