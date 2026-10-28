"use client"

import { DatabaseIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Shared error UI for route error boundaries. In development the real error
 * message is shown (it never is in production, where Next.js replaces server
 * error messages with a digest). Database schema problems get specific setup
 * guidance.
 */
export function ErrorView({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDev = process.env.NODE_ENV === "development"
  // Match on the message: error names aren't reliably preserved across the server/client boundary.
  const schemaProblem = isDev && error.message.includes("database schema is missing")
  const Icon = schemaProblem ? DatabaseIcon : TriangleAlertIcon

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center px-6 py-24 text-center"
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/30">
        <Icon className="size-5 text-destructive" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">
        {schemaProblem ? "Database setup required" : "Something went wrong"}
      </h1>
      <p className="mt-2 max-w-md text-sm text-pretty text-muted-foreground">
        {schemaProblem
          ? "Your Supabase project is missing tables this app needs. Apply the migrations in supabase/migrations (see docs/SUPABASE_SETUP.md), then try again. You can check your project with npm run supabase:check."
          : "We couldn't load this page. Please try again."}
      </p>
      {isDev ? (
        <pre className="mt-5 max-w-xl overflow-x-auto rounded-lg border bg-muted/50 px-4 py-3 text-left font-mono text-xs whitespace-pre-wrap text-muted-foreground">
          {error.name}: {error.message}
        </pre>
      ) : null}
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      ) : null}
      <Button variant="outline" className="mt-8" onClick={reset}>
        <RotateCcwIcon />
        Try again
      </Button>
    </div>
  )
}
