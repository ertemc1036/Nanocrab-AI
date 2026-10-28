import type { Metadata } from "next"
import Link from "next/link"
import { LogOutIcon, PencilIcon } from "lucide-react"
import type { ReactNode } from "react"

import { SubmitButton } from "@/components/forms/submit-button"
import { PageHeader } from "@/components/layout/page-header"
import { ChangePasswordForm } from "@/components/settings/change-password-form"
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog"
import { ProfileForm } from "@/components/settings/profile-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { logOutAction } from "@/lib/auth/actions"
import { getMyProfile } from "@/lib/dal/profiles"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const profile = await getMyProfile()
  const memberSince = new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(profile.createdAt))

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your profile and account." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear in NanoCrab AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm displayName={profile.displayName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Founder profile</CardTitle>
          <CardDescription>
            Your goals, skills, time, budget and preferences. NanoCrab uses these to
            tailor its recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/onboarding">
              <PencilIcon />
              Edit founder profile
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your sign-in details and plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border text-sm">
            <Row label="Email">{profile.email}</Row>
            <Row label="Plan">
              <Badge variant="secondary" className="capitalize">
                {profile.plan}
              </Badge>
            </Row>
            <Row label="Member since">{memberSince}</Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Confirm your current password to set a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of NanoCrab AI on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logOutAction}>
            <SubmitButton variant="outline" pendingLabel="Signing out…">
              <LogOutIcon />
              Sign out
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Permanently delete your account and everything in it. This can&apos;t be
            undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-all">{children}</dd>
    </div>
  )
}
