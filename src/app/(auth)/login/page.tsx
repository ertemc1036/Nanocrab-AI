import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"
import { AuthNotConfigured } from "@/components/auth/not-configured"
import { isSupabaseConfigured } from "@/lib/env"

import { FormSkeleton } from "../form-skeleton"

export const metadata: Metadata = { title: "Log in" }

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to your NanoCrab AI workspace."
      footer={
        <>
          New to NanoCrab AI?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      {isSupabaseConfigured() ? (
        <Suspense fallback={<FormSkeleton />}>
          <LoginForm />
        </Suspense>
      ) : (
        <AuthNotConfigured />
      )}
    </AuthCard>
  )
}
