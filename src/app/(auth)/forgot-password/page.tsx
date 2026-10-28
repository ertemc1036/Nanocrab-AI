import type { Metadata } from "next"
import Link from "next/link"

import { AuthCard } from "@/components/auth/auth-card"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { AuthNotConfigured } from "@/components/auth/not-configured"
import { isSupabaseConfigured } from "@/lib/env"

export const metadata: Metadata = { title: "Reset password" }

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we'll send you a link to set a new password."
      footer={
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      }
    >
      {isSupabaseConfigured() ? <ForgotPasswordForm /> : <AuthNotConfigured />}
    </AuthCard>
  )
}
