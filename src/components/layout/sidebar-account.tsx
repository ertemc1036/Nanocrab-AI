import { UserMenu } from "@/components/layout/user-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/dal/auth"

/** Reads the session, so it must render inside a <Suspense> boundary. */
export async function SidebarAccount() {
  const user = await getCurrentUser()
  if (!user) return null
  return <UserMenu displayName={user.displayName} email={user.email} />
}

export function SidebarAccountSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2" aria-hidden="true">
      <Skeleton className="size-8 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}
