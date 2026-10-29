import { CrownIcon, HandshakeIcon } from "lucide-react"

import { getModeConfig } from "@/lib/nanocrab-ceo/modes"
import type { OperatingMode } from "@/lib/nanocrab-ceo/types"

export function ModeCard({ mode }: { mode: OperatingMode }) {
  const config = getModeConfig(mode)
  const Icon = mode === "ceo" ? CrownIcon : HandshakeIcon
  return (
    <section
      aria-labelledby="operating-mode"
      className="border-gradient relative overflow-hidden rounded-2xl p-6"
    >
      <div
        aria-hidden="true"
        className="bg-glow pointer-events-none absolute inset-0 opacity-70"
      />
      <div className="relative">
        <p className="text-xs font-medium text-muted-foreground">Operating mode</p>
        <h2
          id="operating-mode"
          className="mt-2 flex items-center gap-2 text-lg font-semibold"
        >
          <Icon className="size-5 text-primary" />
          {config.name}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border bg-background/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">NanoCrab</dt>
            <dd className="font-medium">{config.aiRole}</dd>
          </div>
          <div className="rounded-lg border bg-background/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">You</dt>
            <dd className="font-medium">{config.founderRole}</dd>
          </div>
        </dl>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          {config.summary}
        </p>
        {mode === "ceo" ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground/80">
            After your first verified revenue you can take the lead and make NanoCrab your
            AI Co-Founder. You can also switch manually from My Business.
          </p>
        ) : null}
      </div>
    </section>
  )
}
