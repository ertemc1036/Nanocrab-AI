import { PageSkeleton } from "@/components/shared/page-skeleton"

// Per-route boundary: shows instantly on navigation while request-time data
// (session, profile, business) streams in.
export default function Loading() {
  return <PageSkeleton />
}
