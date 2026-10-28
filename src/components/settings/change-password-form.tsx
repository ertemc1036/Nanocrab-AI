"use client"

import { useActionState, useEffect, useRef } from "react"

import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { PasswordInput } from "@/components/forms/password-input"
import { SubmitButton } from "@/components/forms/submit-button"
import { changePasswordAction } from "@/app/(app)/settings/actions"
import { initialFormState } from "@/lib/validation/form"

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialFormState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="grid gap-5" noValidate>
      <FormAlert state={state} />
      <FormField
        name="currentPassword"
        label="Current password"
        error={state.fieldErrors?.currentPassword}
      >
        {(props) => <PasswordInput {...props} autoComplete="current-password" required />}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          name="password"
          label="New password"
          error={state.fieldErrors?.password}
          hint="8+ characters, with a letter and a number."
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
      </div>
      <div>
        <SubmitButton pendingLabel="Updating…">Change password</SubmitButton>
      </div>
    </form>
  )
}
