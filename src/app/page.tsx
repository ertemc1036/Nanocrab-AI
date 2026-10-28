import Link from "next/link"
import {
  ArrowRightIcon,
  BrainIcon,
  CalendarClockIcon,
  FileTextIcon,
  GaugeIcon,
  LockKeyholeIcon,
  MessagesSquareIcon,
  NetworkIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { AgentPreview } from "@/components/marketing/agent-preview"
import { SiteHeader } from "@/components/marketing/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: SparklesIcon,
    title: "Create in minutes",
    description:
      "Start from a template — Study Coach, Coding Assistant, Startup Advisor — or build a completely custom agent from scratch.",
  },
  {
    icon: SlidersHorizontalIcon,
    title: "Shape its personality",
    description:
      "Define purpose, tone, language and custom instructions. Your agent behaves the way you decide.",
  },
  {
    icon: BrainIcon,
    title: "Persistent memory",
    description:
      "Give each agent structured knowledge notes it can draw on in every conversation — editable any time.",
  },
  {
    icon: MessagesSquareIcon,
    title: "Real conversations",
    description:
      "Streamed responses from a frontier model, with full history you can rename, revisit and delete.",
  },
  {
    icon: LockKeyholeIcon,
    title: "Private by design",
    description:
      "Every agent, memory and message is isolated to your account with database-level access control.",
  },
  {
    icon: GaugeIcon,
    title: "Usage you can see",
    description:
      "Transparent usage tracking and sensible limits, so there are no surprises.",
  },
]

const steps = [
  {
    title: "Give it a purpose",
    description:
      "Name your agent, pick a template or start blank, and describe what it's for.",
  },
  {
    title: "Teach it what matters",
    description:
      "Add memory notes — your projects, preferences and context it should always know.",
  },
  {
    title: "Put it to work",
    description:
      "Chat any time. Your agent answers with your rules, your knowledge, your style.",
  },
]

const roadmap: { icon: LucideIcon; title: string }[] = [
  { icon: WrenchIcon, title: "Approved external tools" },
  { icon: FileTextIcon, title: "Document knowledge bases" },
  { icon: CalendarClockIcon, title: "Scheduled automations" },
  { icon: NetworkIcon, title: "Agents that collaborate" },
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
          <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
            <Badge
              variant="outline"
              className="mb-6 gap-1.5 rounded-full bg-background/50 px-3 py-1 text-muted-foreground backdrop-blur"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              Personal AI agents, built by you
            </Badge>
            <h1 className="text-gradient-brand mx-auto max-w-3xl text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-7xl">
              {siteConfig.tagline}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              Create your own AI. Give it a purpose. Make it work for you — no code
              required.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 px-6 font-semibold shadow-[0_10px_30px_-10px_var(--primary)]"
              >
                <Link href="/signup">
                  Create your first agent
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-6">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </div>
          <div className="px-4 pb-24 sm:px-6">
            <AgentPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="max-w-2xl">
              <p className="font-mono text-xs tracking-widest text-primary uppercase">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Not another chatbot. Your own AI, configured your way.
              </h2>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="group bg-card/60 p-6 transition-colors hover:bg-card sm:p-8"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mt-5 font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
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
                Three steps from idea to a working agent.
              </h2>
            </div>
            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="rounded-2xl border bg-card/60 p-6 sm:p-8">
                  <span className="font-mono text-sm text-primary">0{i + 1}</span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Roadmap — clearly labelled as planned, not available */}
        <section id="roadmap" className="scroll-mt-16 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <p className="font-mono text-xs tracking-widest text-primary uppercase">
                  On the roadmap
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  Built to grow into your personal AI operating system.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  These capabilities are planned and not yet available. We&apos;ll ship
                  them when they&apos;re safe and reliable.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
                {roadmap.map(({ icon: Icon, title }) => (
                  <li
                    key={title}
                    className="flex items-center gap-3 rounded-xl border border-dashed bg-card/40 px-4 py-3.5"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{title}</span>
                    <Badge variant="outline" className="ml-auto text-muted-foreground">
                      Planned
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
                Your first agent is a few minutes away.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
                Create an account, give your AI a purpose, and start a conversation.
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>
            © {siteConfig.name}. {siteConfig.tagline}
          </p>
        </div>
      </footer>
    </>
  )
}
