import type { ComponentProps, ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type FormFieldProps = {
  name: string
  label: string
  error?: string
  hint?: ReactNode
  /** Right-aligned element on the label row (e.g. "Forgot password?"). */
  labelAside?: ReactNode
  /** Custom control; receives the id/aria props. Defaults to <Input>. */
  children?: (props: {
    id: string
    name: string
    "aria-invalid": boolean
    "aria-describedby"?: string
  }) => ReactNode
  className?: string
} & Omit<ComponentProps<typeof Input>, "name" | "id" | "children">

/** Label + control + hint + inline validation error, wired for accessibility. */
export function FormField({
  name,
  label,
  error,
  hint,
  labelAside,
  children,
  className,
  ...inputProps
}: FormFieldProps) {
  const id = `field-${name}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined
  const controlProps = {
    id,
    name,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      {children ? children(controlProps) : <Input {...controlProps} {...inputProps} />}
      {error ? (
        <p id={errorId} className="text-[13px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
