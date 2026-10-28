import { Suspense } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import {
  SidebarAccount,
  SidebarAccountSkeleton,
} from "@/components/layout/sidebar-account"

export default function AppLayout({ children }: LayoutProps<"/">) {
  // The shell is static; the account menu streams in once the session is read.
  // Authorization is enforced by each page via requireUser(), not here.
  const account = (
    <Suspense fallback={<SidebarAccountSkeleton />}>
      <SidebarAccount />
    </Suspense>
  )

  return (
    <div className="flex min-h-dvh">
      <AppSidebar footer={account} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader footer={account} />
        <main id="main" className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
