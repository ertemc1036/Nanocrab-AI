import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthCard } from "@/components/auth/auth-card"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { requireUser } from "@/lib/dal/auth"

import { FormSkeleton } from "../form-skeleton"

export const metadata: Metadata = { title: "Set a new password" }

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set a new password"
      description="Choose a strong password you don't use elsewhere."
    >
      <Suspense fallback={<FormSkeleton />}>
        <ResetPasswordGate />
      </Suspense>
    </AuthCard>
  )
}

/** Only reachable with the session created by the recovery email link. */
async function ResetPasswordGate() {
  await requireUser()
  return <ResetPasswordForm />
}
