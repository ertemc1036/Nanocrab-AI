"use client"

import { FlagIcon, Trash2Icon } from "lucide-react"
import { useActionState, useTransition } from "react"

import {
  createMilestoneAction,
  deleteMilestoneAction,
  toggleMilestoneAction,
} from "@/app/(app)/plan/actions"
import { FormAlert } from "@/components/forms/form-alert"
import { SubmitButton } from "@/components/forms/submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BusinessMilestone } from "@/lib/nanocrab-ceo/types"
import { cn } from "@/lib/utils"
import { initialFormState } from "@/lib/validation/form"

export function MilestonesCard({ milestones }: { milestones: BusinessMilestone[] }) {
  const [state, formAction] = useActionState(createMilestoneAction, initialFormState)
  const [pending, startTransition] = useTransition()

  return (
    <section aria-labelledby="milestones" className="rounded-2xl border bg-card p-5">
      <h2 id="milestones" className="flex items-center gap-2 text-sm font-semibold">
        <FlagIcon className="size-4" />
        Milestones
      </h2>
      {milestones.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-start gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={m.status === "achieved"}
                disabled={pending}
                aria-label={`Mark "${m.title}" ${m.status === "achieved" ? "not achieved" : "achieved"}`}
                onChange={(e) =>
                  startTransition(async () => {
                    await toggleMilestoneAction(m.id, e.target.checked)
                  })
                }
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm",
                    m.status === "achieved" && "text-muted-foreground line-through"
                  )}
                >
                  {m.title}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {m.targetDate ? <span>Target {m.targetDate}</span> : null}
                  {m.source === "ai" ? (
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      NanoCrab
                    </Badge>
                  ) : null}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete milestone "${m.title}"`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteMilestoneAction(m.id)
                  })
                }
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="mt-4 grid gap-2 border-t pt-4" noValidate>
        <FormAlert state={state} />
        <label htmlFor="milestone-title" className="text-xs font-medium">
          Add a milestone
        </label>
        <Input
          id="milestone-title"
          name="title"
          maxLength={160}
          placeholder="e.g. First 3 paying customers"
          aria-invalid={Boolean(state.fieldErrors?.title)}
        />
        {state.fieldErrors?.title ? (
          <p className="text-xs text-destructive">{state.fieldErrors.title}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <label htmlFor="milestone-date" className="sr-only">
            Target date
          </label>
          <Input id="milestone-date" name="targetDate" type="date" className="w-auto" />
          <SubmitButton size="sm" pendingLabel="Adding…">
            Add
          </SubmitButton>
        </div>
      </form>
    </section>
  )
}
