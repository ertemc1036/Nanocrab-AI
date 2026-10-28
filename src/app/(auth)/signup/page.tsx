import type { Metadata } from "next"
import Link from "next/link"

import { AuthCard } from "@/components/auth/auth-card"
import { AuthNotConfigured } from "@/components/auth/not-configured"
import { SignUpForm } from "@/components/auth/signup-form"
import { isSupabaseConfigured } from "@/lib/env"

export const metadata: Metadata = { title: "Create account" }

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Your AI. Your Rules. Start building your first agent."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      {isSupabaseConfigured() ? <SignUpForm /> : <AuthNotConfigured />}
    </AuthCard>
  )
}
