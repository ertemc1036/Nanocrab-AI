"use client"

import { ErrorView } from "@/components/shared/error-view"

/** Errors inside the workspace render within the app shell (sidebar stays). */
export default function AppError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorView {...props} />
}
