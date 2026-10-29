"use client"

import { BotIcon, PencilIcon, Trash2Icon, UserRoundIcon } from "lucide-react"
import { useActionState, useEffect, useRef, useState, useTransition } from "react"

import {
  createMemoryAction,
  deleteMemoryAction,
  updateMemoryAction,
} from "@/app/(app)/memory/actions"
import { FormAlert } from "@/components/forms/form-alert"
import { NativeSelect } from "@/components/forms/native-select"
import { SubmitButton } from "@/components/forms/submit-button"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { FounderMemory, MemoryCategory } from "@/lib/nanocrab-ceo/types"
import { initialFormState } from "@/lib/validation/form"

export const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  fact: "Business facts",
  goal: "Goals",
  decision: "Decisions",
  preference: "Preferences",
  challenge: "Current challenges",
  progress: "Progress notes",
}

function CategorySelect({ id, defaultValue }: { id: string; defaultValue?: string }) {
  return (
    <NativeSelect id={id} name="category" defaultValue={defaultValue ?? "fact"}>
      {(Object.keys(CATEGORY_LABELS) as MemoryCategory[]).map((c) => (
        <option key={c} value={c}>
          {CATEGORY_LABELS[c]}
        </option>
      ))}
    </NativeSelect>
  )
}

export function NewMemoryForm() {
  const [state, formAction] = useActionState(createMemoryAction, initialFormState)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.status === "success") ref.current?.reset()
  }, [state])
  return (
    <form ref={ref} action={formAction} className="grid gap-3" noValidate>
      <FormAlert state={state} />
      <div className="grid gap-2">
        <Label htmlFor="memory-category">Type</Label>
        <CategorySelect id="memory-category" defaultValue={state.values?.category} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="memory-content">What should NanoCrab remember?</Label>
        <Textarea
          id="memory-content"
          name="content"
          rows={3}
          maxLength={1000}
          placeholder="e.g. We only sell to businesses, not consumers."
          defaultValue={state.values?.content}
          aria-invalid={Boolean(state.fieldErrors?.content)}
        />
        {state.fieldErrors?.content ? (
          <p className="text-xs text-destructive">{state.fieldErrors.content}</p>
        ) : null}
      </div>
      <div>
        <SubmitButton pendingLabel="Saving…">Save memory</SubmitButton>
      </div>
    </form>
  )
}

export function MemoryItem({ memory }: { memory: FounderMemory }) {
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [state, formAction] = useActionState(
    async (prev: Awaited<ReturnType<typeof updateMemoryAction>>, formData: FormData) => {
      const result = await updateMemoryAction(prev, formData)
      if (result.status === "success") setEditing(false)
      return result
    },
    initialFormState
  )

  if (editing) {
    return (
      <li className="rounded-xl border bg-card p-4">
        <form action={formAction} className="grid gap-3" noValidate>
          <FormAlert state={state.status === "error" ? state : { status: "idle" }} />
          <input type="hidden" name="id" value={memory.id} />
          <Label htmlFor={`mem-cat-${memory.id}`} className="sr-only">
            Type
          </Label>
          <CategorySelect id={`mem-cat-${memory.id}`} defaultValue={memory.category} />
          <Label htmlFor={`mem-${memory.id}`} className="sr-only">
            Memory
          </Label>
          <Textarea
            id={`mem-${memory.id}`}
            name="content"
            rows={3}
            maxLength={1000}
            defaultValue={memory.content}
          />
          {state.fieldErrors?.content ? (
            <p className="text-xs text-destructive">{state.fieldErrors.content}</p>
          ) : null}
          <div className="flex gap-2">
            <SubmitButton size="sm" pendingLabel="Saving…">
              Save
            </SubmitButton>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="group flex items-start gap-3 rounded-xl border bg-card p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm break-words whitespace-pre-wrap">{memory.content}</p>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          {memory.source === "user" ? (
            <>
              <UserRoundIcon className="size-3" /> Added by you
            </>
          ) : (
            <>
              <BotIcon className="size-3" /> Suggested by NanoCrab, approved by you
            </>
          )}
        </p>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Edit memory"
          onClick={() => setEditing(true)}
        >
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete memory"
          onClick={() => setConfirm(true)}
          disabled={pending}
        >
          <Trash2Icon />
        </Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              NanoCrab will no longer use it in conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() =>
                startTransition(async () => {
                  const r = await deleteMemoryAction(memory.id)
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
