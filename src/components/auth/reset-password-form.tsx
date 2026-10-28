"use client"

import { useActionState } from "react"

import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { PasswordInput } from "@/components/forms/password-input"
import { SubmitButton } from "@/components/forms/submit-button"
import { resetPasswordAction } from "@/lib/auth/actions"
import { initialFormState } from "@/lib/validation/form"

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, initialFormState)

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert state={state} />
      <FormField
        name="password"
        label="New password"
        hint="At least 8 characters, with a letter and a number."
        error={state.fieldErrors?.password}
      >
        {(props) => <PasswordInput {...props} autoComplete="new-password" required />}
      </FormField>
      <FormField
        name="confirmPassword"
        label="Confirm new password"
        error={state.fieldErrors?.confirmPassword}
      >
        {(props) => <PasswordInput {...props} autoComplete="new-password" required />}
      </FormField>
      <SubmitButton className="w-full" pendingLabel="Saving…">
        Set new password
      </SubmitButton>
    </form>
  )
}
