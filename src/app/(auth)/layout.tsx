import Link from "next/link"

import { Logo } from "@/components/brand/logo"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
      <div aria-hidden="true" className="bg-glow absolute inset-0 -z-10" />
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Link href="/" className="rounded-md" aria-label="NanoCrab AI home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
        {children}
      </main>
    </div>
  )
}
