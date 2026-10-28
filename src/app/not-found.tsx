import Link from "next/link"
import { CompassIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="bg-glow flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
        <CompassIcon className="size-5 text-primary" />
      </div>
      <p className="font-mono text-xs tracking-widest text-primary uppercase">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This page doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Button asChild variant="outline" className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  )
}
