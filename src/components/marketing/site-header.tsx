import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-md" aria-label="NanoCrab AI home">
          <Logo />
        </Link>
        <nav aria-label="Marketing" className="hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <a href="#features">Features</a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <a href="#how-it-works">How it works</a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <a href="#roadmap">Roadmap</a>
          </Button>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="font-semibold">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
