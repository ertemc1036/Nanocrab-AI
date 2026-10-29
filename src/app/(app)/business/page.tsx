import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BusinessForm } from "@/components/business/business-form"
import { FounderSnapshot } from "@/components/business/founder-snapshot"
import { ModeSwitch } from "@/components/business/mode-switch"
import { ModeCard } from "@/components/command-center/mode-card"
import { PageHeader } from "@/components/layout/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentBusiness } from "@/lib/dal/business"
import { getMyFounderProfile } from "@/lib/dal/founder"
import { buildFounderContext } from "@/lib/nanocrab-ceo/founder-profile/context"

export const metadata: Metadata = { title: "My Business" }

export default async function MyBusinessPage() {
  const profile = await getMyFounderProfile()
  if (!profile?.onboardingCompletedAt) redirect("/onboarding")
  const business = await getCurrentBusiness()
  const context = buildFounderContext(profile)

  if (!business) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Create your business workspace"
          description="One place for your business: its plan, tasks, milestones and progress toward first revenue."
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader>
              <CardTitle>Your business</CardTitle>
              <CardDescription>
                {profile.hasIdea
                  ? "We've started from the idea you shared. Adjust it as much as you like."
                  : "Have a direction in mind? Start a workspace for it. Guided opportunity discovery is in development."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessForm defaultDescription={profile.ideaDescription} />
            </CardContent>
          </Card>
          <FounderSnapshot context={context} />
        </div>
      </div>
    )
  }

  const created = new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(business.createdAt))

  return (
    <div className="space-y-8">
      <PageHeader
        title={business.name}
        description={`Workspace created ${created} · ${
          business.origin === "opportunity"
            ? "From a NanoCrab opportunity"
            : "Your own idea"
        }`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
            <CardDescription>
              Your AI CEO will use these to plan with you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessForm
              business={{
                id: business.id,
                name: business.name,
                description: business.description,
              }}
            />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <div className="space-y-3">
            <ModeCard mode={business.operatingMode} />
            <ModeSwitch key={business.operatingMode} mode={business.operatingMode} />
          </div>
          <FounderSnapshot context={context} />
        </div>
      </div>
    </div>
  )
}
