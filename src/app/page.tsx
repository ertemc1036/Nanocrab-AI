import Link from "next/link"
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  CrownIcon,
  HandshakeIcon,
  LockKeyholeIcon,
  ScaleIcon,
  SearchCheckIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { CeoPreview } from "@/components/marketing/ceo-preview"
import { SiteHeader } from "@/components/marketing/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { MODES } from "@/lib/nanocrab-ceo/modes"

const steps = [
  {
    title: "Tell NanoCrab where you're starting",
    description:
      "Your goals, skills, time and budget. Nothing is assumed that you didn't share.",
  },
  {
    title: "Choose an opportunity",
    description:
      "A few realistic options, evaluated on cost, effort, customers and risk. You pick.",
  },
  {
    title: "Execute the plan",
    description:
      "Your AI CEO breaks the plan into tasks and recommends the next action, every day.",
  },
  {
    title: "Earn your first revenue",
    description:
      "Then you take the lead as CEO, and NanoCrab becomes your AI Co-Founder.",
  },
]

const availability: { icon: LucideIcon; title: string; available: boolean }[] = [
  { icon: UserRoundIcon, title: "Founder onboarding & profile", available: true },
  { icon: BriefcaseBusinessIcon, title: "Business workspace & journey", available: true },
  { icon: LockKeyholeIcon, title: "Private, isolated data", available: true },
  { icon: SparklesIcon, title: "AI CEO conversations", available: false },
  { icon: SearchCheckIcon, title: "Opportunity evaluation", available: false },
  { icon: ClipboardListIcon, title: "Business plans & tasks", available: false },
  {
    icon: CircleDollarSignIcon,
    title: "Revenue milestone & Co-Founder mode",
    available: false,
  },
]

const principles: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ShieldCheckIcon,
    title: "You stay in control",
    description:
      "NanoCrab proposes and organizes. You approve every significant decision and every action that touches the real world.",
  },
  {
    icon: ScaleIcon,
    title: "Facts, not hype",
    description:
      "Research is separated from assumptions. No invented market data, no made-up projections.",
  },
  {
    icon: CircleDollarSignIcon,
    title: "No income guarantees",
    description:
      "NanoCrab helps you build and test a business. Whether it earns money depends on you and your market.",
  },
]

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
          <div aria-hidden="true" className="bg-glow absolute inset-0 -z-10" />
          <div className="mx-auto max-w-6xl px-4 pt-20 pb-14 text-center sm:px-6 sm:pt-28">
            <Badge
              variant="outline"
              className="mb-6 gap-1.5 rounded-full bg-background/50 px-3 py-1 text-muted-foreground backdrop-blur"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              Your personal AI CEO
            </Badge>
            <h1 className="text-gradient-brand mx-auto max-w-3xl text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-7xl">
              From zero to founder.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              NanoCrab leads the process until you earn your first revenue. Then you
              become the CEO, and NanoCrab becomes your AI Co-Founder.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 px-6 font-semibold shadow-[0_10px_30px_-10px_var(--primary)]"
              >
                <Link href="/signup">
                  Start your journey
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-6">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </div>
          <div className="px-4 pb-24 sm:px-6">
            <CeoPreview />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="max-w-2xl">
              <p className="font-mono text-xs tracking-widest text-primary uppercase">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                A structured path to your first customer and first revenue.
              </h2>
            </div>
            <ol className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li key={step.title} className="rounded-2xl border bg-card/60 p-6">
                  <span className="font-mono text-sm text-primary">0{i + 1}</span>
                  <h3 className="mt-4 font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Two modes */}
        <section id="features" className="scroll-mt-16 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="max-w-2xl">
              <p className="font-mono text-xs tracking-widest text-primary uppercase">
                Two modes
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                It leads while you learn. Then it follows your lead.
              </h2>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {(["ceo", "cofounder"] as const).map((id) => {
                const mode = MODES[id]
                const Icon = id === "ceo" ? CrownIcon : HandshakeIcon
                return (
                  <div
                    key={id}
                    className={
                      id === "ceo"
                        ? "border-gradient rounded-2xl p-6 sm:p-8"
                        : "rounded-2xl border bg-card/60 p-6 sm:p-8"
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
                        <Icon className="size-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold tracking-tight">{mode.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          NanoCrab: {mode.aiRole} · You: {mode.founderRole}
                        </p>
                      </div>
                    </div>
                    <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                      {mode.summary}
                    </p>
                    <ul className="mt-5 grid gap-2 text-sm">
                      {mode.responsibilities.map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3">
              {principles.map(({ icon: Icon, title, description }) => (
                <div key={title} className="bg-card/60 p-6 sm:p-8">
                  <Icon className="size-5 text-primary" />
                  <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Availability — honest about what exists today */}
        <section id="roadmap" className="scroll-mt-16 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-md">
                <p className="font-mono text-xs tracking-widest text-primary uppercase">
                  Building in the open
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  What you can use today.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  NanoCrab is early. We ship each capability when it&apos;s reliable, and
                  label everything else clearly.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:w-[560px]">
                {availability.map(({ icon: Icon, title, available }) => (
                  <li
                    key={title}
                    className={
                      available
                        ? "flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5"
                        : "flex items-center gap-3 rounded-xl border border-dashed bg-card/40 px-4 py-3.5"
                    }
                  >
                    <Icon
                      className={
                        available
                          ? "size-4 shrink-0 text-primary"
                          : "size-4 shrink-0 text-muted-foreground"
                      }
                    />
                    <span className="text-sm">{title}</span>
                    <Badge
                      variant={available ? "secondary" : "outline"}
                      className="ml-auto shrink-0 text-muted-foreground"
                    >
                      {available ? "Available" : "In development"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="border-gradient bg-glow relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-16">
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Don&apos;t know what to start? Start here.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
                Create an account and tell NanoCrab where you&apos;re starting from. It
                takes about three minutes.
              </p>
              <Button asChild size="lg" className="mt-8 h-11 px-6 font-semibold">
                <Link href="/signup">
                  Get started free
                  <ArrowRightIcon />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo />
            <p>
              © {siteConfig.name}. {siteConfig.tagline}
            </p>
          </div>
          <p className="text-center text-xs leading-relaxed text-muted-foreground/70 sm:text-left">
            NanoCrab AI provides planning and decision support, not financial, legal or
            tax advice. You remain responsible for your business decisions. No income or
            results are guaranteed.
          </p>
        </div>
      </footer>
    </>
  )
}
