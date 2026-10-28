import { BrainIcon, RocketIcon, SendHorizontalIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

/**
 * Static product illustration for the landing page. It is decorative
 * marketing art, not a live agent, and is hidden from assistive tech.
 */
export function AgentPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-4xl select-none">
      <div className="bg-glow absolute -inset-x-20 -top-16 bottom-0 -z-10 blur-2xl" />
      <div className="border-gradient overflow-hidden rounded-2xl shadow-[0_40px_120px_-40px_oklch(0_0_0/80%)]">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">
            nanocrab.ai/agents/startup-advisor
          </span>
        </div>
        <div className="grid md:grid-cols-[260px_1fr]">
          {/* Agent config */}
          <div className="hidden space-y-5 border-r border-border p-5 md:block">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <RocketIcon className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Startup Advisor</p>
                <p className="text-xs text-muted-foreground">Your strategy partner</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Personality
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">Direct</Badge>
                <Badge variant="secondary">Analytical</Badge>
                <Badge variant="secondary">Concise</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Memory
              </p>
              {[
                "Bootstrapped, 2 founders",
                "B2B SaaS for clinics",
                "Runway: 9 months",
              ].map((note) => (
                <div
                  key={note}
                  className="flex items-center gap-2 rounded-lg bg-secondary/60 px-2.5 py-2 text-xs text-secondary-foreground"
                >
                  <BrainIcon className="size-3.5 shrink-0 text-brand-2" />
                  {note}
                </div>
              ))}
            </div>
          </div>
          {/* Chat */}
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm">
              Should we raise a seed round now or wait until we hit $20k MRR?
            </div>
            <div className="flex max-w-[90%] gap-3">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
                <RocketIcon className="size-3.5 text-primary" />
              </div>
              <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
                <p>
                  With 9 months of runway and two founders, you have time to be selective.
                  Clinic software sells on trust — a few reference customers will move
                  your valuation more than the round timing will.
                </p>
                <p className="text-muted-foreground">
                  Suggestion: set a 90-day target of 8 paying clinics, then start investor
                  conversations from a position of traction.
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-input bg-background/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Message Startup Advisor…
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <SendHorizontalIcon className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
