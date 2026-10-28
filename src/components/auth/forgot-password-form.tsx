"use client"

import { useActionState } from "react"

import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { requestPasswordResetAction } from "@/lib/auth/actions"
import { initialFormState } from "@/lib/validation/form"

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialFormState)

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert state={state} />
      {state.status !== "success" ? (
        <>
          <FormField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={state.values?.email}
            error={state.fieldErrors?.email}
          />
          <SubmitButton className="w-full" pendingLabel="Sending…">
            Send reset link
          </SubmitButton>
        </>
      ) : null}
    </form>
  )
}
