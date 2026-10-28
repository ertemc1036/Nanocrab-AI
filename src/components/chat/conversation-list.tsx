"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  MessageSquarePlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useState, useTransition } from "react"

import {
  deleteConversationAction,
  renameConversationAction,
} from "@/app/(app)/ceo/actions"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { ConversationSummary } from "@/lib/dal/chat"
import { cn } from "@/lib/utils"

export function ConversationList({
  conversations,
  onNavigate,
}: {
  conversations: ConversationSummary[]
  onNavigate?: () => void
}) {
  const params = useParams<{ conversationId?: string }>()
  const activeId = params.conversationId

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Button asChild variant="outline" className="w-full justify-start">
        <Link href="/ceo" onClick={onNavigate}>
          <MessageSquarePlusIcon />
          New conversation
        </Link>
      </Button>
      <p className="mt-5 mb-2 px-2 text-xs font-medium text-muted-foreground">History</p>
      {conversations.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">No conversations yet.</p>
      ) : (
        <ul className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
          {conversations.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              active={c.id === activeId}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ConversationItem({
  conversation,
  active,
  onNavigate,
}: {
  conversation: ConversationSummary
  active: boolean
  onNavigate?: () => void
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(conversation.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      const result = await renameConversationAction(conversation.id, title)
      if (result.ok) {
        setEditing(false)
        setError(null)
      } else setError(result.message ?? "Couldn't rename.")
    })

  const remove = () =>
    startTransition(async () => {
      const result = await deleteConversationAction(conversation.id)
      if (result.ok) {
        setConfirmDelete(false)
        if (active) router.push("/ceo")
      } else setError(result.message ?? "Couldn't delete.")
    })

  if (editing) {
    return (
      <li className="p-1">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="flex gap-1"
        >
          <Input
            autoFocus
            value={title}
            maxLength={120}
            aria-label="Conversation title"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditing(false)
                setTitle(conversation.title)
              }
            }}
            className="h-8"
          />
          <Button type="submit" size="sm" disabled={pending}>
            Save
          </Button>
        </form>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </li>
    )
  }

  return (
    <li className="group relative">
      <Link
        href={`/ceo/${conversation.id}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block truncate rounded-lg py-2 pr-9 pl-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        )}
      >
        {conversation.title}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Options for ${conversation.title}`}
            className="absolute top-1/2 right-1 size-7 -translate-y-1/2 opacity-70 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <PencilIcon />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              The messages are deleted permanently. Tasks, plan changes and memories you
              approved stay in your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
