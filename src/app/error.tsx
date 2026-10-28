"use client"

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/30">
        <TriangleAlertIcon className="size-5 text-destructive" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      ) : null}
      <Button variant="outline" className="mt-8" onClick={reset}>
        <RotateCcwIcon />
        Try again
      </Button>
    </main>
  )
}
