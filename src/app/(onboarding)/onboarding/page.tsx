import type { Metadata } from "next"
import { Suspense } from "react"

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { Skeleton } from "@/components/ui/skeleton"
import { getMyFounderProfile } from "@/lib/dal/founder"
import {
  EMPTY_ANSWERS,
  type OnboardingAnswers,
} from "@/lib/nanocrab-ceo/founder-profile/answers"

export const metadata: Metadata = { title: "Founder onboarding" }

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <Onboarding />
    </Suspense>
  )
}

async function Onboarding() {
  // getMyFounderProfile() calls requireUser(): signed-out visitors are redirected.
  const profile = await getMyFounderProfile()
  const initial: OnboardingAnswers = profile
    ? {
        goal: profile.goal,
        goalDetails: profile.goalDetails,
        skills: profile.skills,
        interests: profile.interests,
        weeklyHours: profile.weeklyHours,
        budget: profile.budget,
        businessPreference: profile.businessPreference,
        hasIdea: profile.hasIdea,
        ideaDescription: profile.ideaDescription,
        countryCode: profile.countryCode,
      }
    : EMPTY_ANSWERS

  return <OnboardingFlow initial={initial} mode={profile ? "edit" : "create"} />
}

function OnboardingSkeleton() {
  return (
    <div className="w-full max-w-2xl space-y-8" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-1.5 w-full" />
      <Skeleton className="h-9 w-3/4" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
