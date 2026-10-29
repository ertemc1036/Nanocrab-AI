"use client"

import { useActionState, useEffect, useRef } from "react"

import { createTaskAction, updateTaskAction } from "@/app/(app)/tasks/actions"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { NativeSelect } from "@/components/forms/native-select"
import { SubmitButton } from "@/components/forms/submit-button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { BusinessTask } from "@/lib/nanocrab-ceo/types"
import { initialFormState } from "@/lib/validation/form"

export function TaskForm({ task, onDone }: { task?: BusinessTask; onDone?: () => void }) {
  const [state, formAction] = useActionState(
    task ? updateTaskAction : createTaskAction,
    initialFormState
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success") {
      if (!task) formRef.current?.reset()
      onDone?.()
    }
  }, [state, task, onDone])

  const v = state.values
  const prefix = task ? `task-${task.id}` : "new-task"
  return (
    <form ref={formRef} action={formAction} className="grid gap-4" noValidate>
      <FormAlert state={state.status === "error" ? state : { status: "idle" }} />
      {task ? <input type="hidden" name="id" value={task.id} /> : null}
      <FormField
        name="title"
        label="Task"
        maxLength={200}
        placeholder="e.g. Ask 5 local cafés about weekly bread orders"
        defaultValue={v?.title ?? task?.title ?? ""}
        error={state.fieldErrors?.title}
      />
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-description`}>Details (optional)</Label>
        <Textarea
          id={`${prefix}-description`}
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={v?.description ?? task?.description ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}-priority`}>Priority</Label>
          <NativeSelect
            id={`${prefix}-priority`}
            name="priority"
            defaultValue={v?.priority ?? task?.priority ?? "medium"}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </NativeSelect>
        </div>
        <FormField
          name="dueDate"
          label="Due date (optional)"
          type="date"
          defaultValue={v?.dueDate ?? task?.dueDate ?? ""}
          error={state.fieldErrors?.dueDate}
        />
      </div>
      <div>
        <SubmitButton pendingLabel="Saving…">
          {task ? "Save task" : "Add task"}
        </SubmitButton>
      </div>
    </form>
  )
}
