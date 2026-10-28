"use client"

import { useActionState } from "react"

import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { updateProfileAction } from "@/app/(app)/settings/actions"
import { initialFormState } from "@/lib/validation/form"

export function ProfileForm({ displayName }: { displayName: string | null }) {
  const [state, formAction] = useActionState(updateProfileAction, initialFormState)

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert state={state} />
      <FormField
        name="displayName"
        label="Display name"
        autoComplete="name"
        maxLength={80}
        required
        defaultValue={state.values?.displayName ?? displayName ?? ""}
        error={state.fieldErrors?.displayName}
        hint="Shown in your workspace. Up to 80 characters."
      />
      <div>
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  )
}
