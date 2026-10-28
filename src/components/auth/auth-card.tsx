import type { ReactNode } from "react"

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="rounded-2xl border bg-card/80 p-6 shadow-[0_30px_80px_-40px_oklch(0_0_0/80%)] backdrop-blur sm:p-7">
        {children}
      </div>
      {footer ? (
        <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  )
}
