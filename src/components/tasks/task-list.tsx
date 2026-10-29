"use client"

import {
  BotIcon,
  MoreHorizontalIcon,
  OctagonAlertIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useOptimistic, useState, useTransition } from "react"

import {
  deleteTaskAction,
  setTaskBlockedAction,
  setTaskStatusAction,
} from "@/app/(app)/tasks/actions"
import { TaskForm } from "@/components/tasks/task-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { BusinessTask, TaskStatus } from "@/lib/nanocrab-ceo/types"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
}
const PRIORITY_STYLE = {
  high: "border-destructive/40 text-destructive",
  medium: "border-warning/40 text-warning",
  low: "text-muted-foreground",
} as const

export function TaskList({ tasks, today }: { tasks: BusinessTask[]; today: string }) {
  const groups: Record<TaskStatus, BusinessTask[]> = {
    todo: [],
    in_progress: [],
    done: [],
  }
  for (const t of tasks) groups[t.status].push(t)
  return (
    <Tabs defaultValue="todo">
      <TabsList>
        {(Object.keys(groups) as TaskStatus[]).map((s) => (
          <TabsTrigger key={s} value={s}>
            {STATUS_LABEL[s]}{" "}
            <span className="ml-1 text-muted-foreground tabular-nums">
              {groups[s].length}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {(Object.keys(groups) as TaskStatus[]).map((s) => (
        <TabsContent key={s} value={s} className="mt-4">
          {groups[s].length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
              {s === "done" ? "Completed tasks will appear here." : "Nothing here."}
            </p>
          ) : (
            <ul className="space-y-2">
              {groups[s].map((t) => (
                <TaskRow key={t.id} task={t} today={today} />
              ))}
            </ul>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}

function TaskRow({ task, today }: { task: BusinessTask; today: string }) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  // Optimistic status so the checkbox responds instantly; reverts if the save fails.
  const [status, setOptimisticStatus] = useOptimistic(task.status)
  const done = status === "done"
  const overdue = !done && task.dueDate !== null && task.dueDate < today

  const setStatus = (next: TaskStatus) =>
    startTransition(async () => {
      setOptimisticStatus(next)
      const r = await setTaskStatusAction(task.id, next)
      setError(r.ok ? null : (r.message ?? "Couldn't update."))
    })

  const setBlocked = (next: string) =>
    startTransition(async () => {
      const r = await setTaskBlockedAction(task.id, next)
      setError(r.ok ? null : (r.message ?? "Couldn't update."))
      if (r.ok) setBlocking(false)
    })
  const blocked = !done && task.blockedReason.trim() !== ""

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card p-4",
        pending && "opacity-60"
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-primary"
        checked={done}
        disabled={pending}
        onChange={(e) => setStatus(e.target.checked ? "done" : "todo")}
        aria-label={
          done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`
        }
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium break-words",
            done && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        {task.description ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {task.description}
          </p>
        ) : null}
        {task.successCriteria || task.deliverable ? (
          <dl className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {task.deliverable ? (
              <div>
                <dt className="inline font-medium text-foreground">Deliverable: </dt>
                <dd className="inline">{task.deliverable}</dd>
              </div>
            ) : null}
            {task.successCriteria ? (
              <div>
                <dt className="inline font-medium text-foreground">Done when: </dt>
                <dd className="inline">{task.successCriteria}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {blocked ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-warning">
            <OctagonAlertIcon className="mt-px size-3.5 shrink-0" />
            <span className="break-words">Blocked: {task.blockedReason}</span>
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge
            variant="outline"
            className={cn("capitalize", PRIORITY_STYLE[task.priority])}
          >
            {task.priority}
          </Badge>
          {task.dueDate ? (
            <span
              className={cn(
                overdue ? "font-medium text-destructive" : "text-muted-foreground"
              )}
            >
              {overdue ? "Overdue · " : "Due "}
              {task.dueDate}
            </span>
          ) : null}
          {task.source === "ai" ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <BotIcon className="size-3" />
              Suggested by NanoCrab
            </span>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Options for "${task.title}"`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          {(["todo", "in_progress", "done"] as TaskStatus[])
            .filter((s) => s !== status)
            .map((s) => (
              <DropdownMenuItem key={s} onSelect={() => setStatus(s)}>
                Move to {STATUS_LABEL[s]}
              </DropdownMenuItem>
            ))}
          {!done ? (
            blocked ? (
              <DropdownMenuItem onSelect={() => setBlocked("")}>
                <OctagonAlertIcon />
                Unblock
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() => {
                  setReason("")
                  setBlocking(true)
                }}
              >
                <OctagonAlertIcon />
                Mark as blocked
              </DropdownMenuItem>
            )
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription className="sr-only">
              Change the task details
            </DialogDescription>
          </DialogHeader>
          <TaskForm task={task} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={blocking} onOpenChange={setBlocking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What&apos;s blocking this task?</DialogTitle>
            <DialogDescription>
              Your AI CEO uses this to help you remove the blocker or find another route.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (reason.trim()) setBlocked(reason)
            }}
          >
            <Label htmlFor={`block-${task.id}`} className="sr-only">
              Reason
            </Label>
            <Textarea
              id={`block-${task.id}`}
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Waiting for the supplier's price list"
            />
            <div>
              <Button type="submit" disabled={pending || !reason.trim()}>
                Mark as blocked
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{task.title}&rdquo; will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() =>
                startTransition(async () => {
                  const r = await deleteTaskAction(task.id)
                  if (!r.ok) setError(r.message ?? "Couldn't delete.")
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
