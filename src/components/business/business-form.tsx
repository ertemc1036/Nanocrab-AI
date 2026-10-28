"use client"

import { useActionState } from "react"

import { createBusinessAction, updateBusinessAction } from "@/app/(app)/business/actions"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Textarea } from "@/components/ui/textarea"
import { initialFormState } from "@/lib/validation/form"

export function BusinessForm({
  business,
  defaultDescription = "",
}: {
  business?: { id: string; name: string; description: string }
  defaultDescription?: string
}) {
  const [state, formAction] = useActionState(
    business ? updateBusinessAction : createBusinessAction,
    initialFormState
  )

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert state={state} />
      {business ? <input type="hidden" name="id" value={business.id} /> : null}
      <FormField
        name="name"
        label="Business name"
        hint="A working name is fine — you can change it any time."
        maxLength={80}
        required
        defaultValue={state.values?.name ?? business?.name ?? ""}
        error={state.fieldErrors?.name}
      />
      <FormField
        name="description"
        label="What does it do?"
        hint="Who is it for, and what problem does it solve? Optional."
        error={state.fieldErrors?.description}
      >
        {(props) => (
          <Textarea
            {...props}
            rows={4}
            maxLength={1000}
            defaultValue={
              state.values?.description ?? business?.description ?? defaultDescription
            }
          />
        )}
      </FormField>
      <div>
        <SubmitButton
          pendingLabel={business ? "Saving…" : "Creating…"}
          className="font-semibold"
        >
          {business ? "Save changes" : "Create workspace"}
        </SubmitButton>
      </div>
    </form>
  )
}
