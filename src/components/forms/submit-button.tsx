"use client"

import { Loader2Icon } from "lucide-react"
import type { ComponentProps } from "react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

/** Submit button that disables itself and shows a spinner while pending. */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
    >
      {pending ? <Loader2Icon className="animate-spin" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}
