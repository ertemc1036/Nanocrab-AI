import { PlugZapIcon } from "lucide-react"

/** Shown instead of auth forms when Supabase environment variables are missing. */
export function AuthNotConfigured() {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-warning/10 ring-1 ring-warning/30">
        <PlugZapIcon className="size-5 text-warning" />
      </div>
      <p className="text-sm font-medium">Authentication isn&apos;t configured</p>
      <p className="text-[13px] text-pretty text-muted-foreground">
        Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, then
        restart the app. See the README for setup steps.
      </p>
    </div>
  )
}
