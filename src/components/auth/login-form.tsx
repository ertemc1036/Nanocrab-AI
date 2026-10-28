"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState } from "react"

import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { PasswordInput } from "@/components/forms/password-input"
import { SubmitButton } from "@/components/forms/submit-button"
import { logInAction } from "@/lib/auth/actions"
import { initialFormState, type FormState } from "@/lib/validation/form"

const LINK_ERRORS: Record<string, string> = {
  link_invalid: "That link is invalid or has expired. Please try again.",
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [state, formAction] = useActionState(logInAction, initialFormState)
  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""]
  const shown: FormState =
    state.status === "idle" && linkError ? { status: "error", message: linkError } : state

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert state={shown} />
      <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />
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
        error={state.fieldErrors?.password}
        labelAside={
          <Link
            href="/forgot-password"
            className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        }
      >
        {(props) => <PasswordInput {...props} autoComplete="current-password" required />}
      </FormField>
      <SubmitButton className="mt-1 w-full" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  )
}
