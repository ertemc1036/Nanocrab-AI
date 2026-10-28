import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div
      className="grid h-[calc(100dvh-7.5rem)] gap-6 lg:h-[calc(100dvh-5rem)] lg:grid-cols-[240px_1fr]"
      aria-busy="true"
    >
      <span className="sr-only">Loading…</span>
      <div className="hidden space-y-2 lg:block">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="flex flex-col justify-end gap-4">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="ml-auto h-10 w-1/2" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  )
}
