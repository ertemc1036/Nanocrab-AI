import Link from "next/link"

import { Logo } from "@/components/brand/logo"

export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden="true" className="bg-glow absolute inset-x-0 top-0 -z-10 h-96" />
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Link href="/dashboard" className="rounded-md" aria-label="NanoCrab AI">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        {children}
      </main>
    </div>
  )
}
