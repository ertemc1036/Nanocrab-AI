"use client"

import { MailCheckIcon } from "lucide-react"
import { useActionState } from "react"

import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { PasswordInput } from "@/components/forms/password-input"
import { SubmitButton } from "@/components/forms/submit-button"
import { signUpAction } from "@/lib/auth/actions"
import { initialFormState } from "@/lib/validation/form"

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, initialFormState)

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-success/10 ring-1 ring-success/30">
          <MailCheckIcon className="size-5 text-success" />
        </div>
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-pretty text-muted-foreground">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert state={state} />
      <FormField
        name="displayName"
        label="Name"
        autoComplete="name"
        required
        maxLength={80}
        defaultValue={state.values?.displayName}
        error={state.fieldErrors?.displayName}
      />
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
      <FormField
        name="password"
        label="Password"
        hint="At least 8 characters, with a letter and a number."
        error={state.fieldErrors?.password}
      >
        {(props) => <PasswordInput {...props} autoComplete="new-password" required />}
      </FormField>
      <SubmitButton className="mt-1 w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  )
}
