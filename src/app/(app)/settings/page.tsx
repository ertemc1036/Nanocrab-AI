import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your profile and account." />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Profile and account settings become available once you&apos;re signed in.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
