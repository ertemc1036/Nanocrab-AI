import { Skeleton } from "@/components/ui/skeleton"

export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="grid gap-5" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="mt-1 h-9 w-full" />
    </div>
  )
}
