import { UserMenu } from "@/components/layout/user-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/dal/auth"
import { getMyDisplayName } from "@/lib/dal/profiles"

/**
 * Reads the session and profile, so it must render inside a <Suspense>
 * boundary and an AccountErrorBoundary (see app layout).
 */
export async function SidebarAccount() {
  const user = await getCurrentUser()
  if (!user) return null
  const displayName = await getMyDisplayName()
  return <UserMenu displayName={displayName} email={user.email} />
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
