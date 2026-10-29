import type { Metadata } from "next"
import { CircleDollarSignIcon, HandshakeIcon, InfoIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { FirstRevenueMoment } from "@/components/revenue/first-revenue-moment"
import { RevenueForm } from "@/components/revenue/revenue-form"
import { formatMoney, RevenueList } from "@/components/revenue/revenue-list"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getMyFounderProfile } from "@/lib/dal/founder"
import { listRevenue, revenueTotals } from "@/lib/dal/revenue"
import { listTransitions } from "@/lib/dal/transitions"
import { requireWorkspaceScope } from "@/lib/dal/workspace"

export const metadata: Metadata = { title: "Revenue" }

export default async function RevenuePage() {
  const scope = await requireWorkspaceScope()
  const [records, transitions, profile] = await Promise.all([
    listRevenue(scope),
    listTransitions(scope),
    getMyFounderProfile(),
  ])
  const totals = revenueTotals(records)
  const firstVerified = [...records]
    .filter((r) => r.status === "verified")
    .sort((a, b) => a.saleDate.localeCompare(b.saleDate))[0]
  const showMoment =
    firstVerified !== undefined &&
    scope.business.operatingMode === "ceo" &&
    !transitions.some((t) => t.reason === "first_revenue")
  const hasUnverified = records.some((r) => r.status === "self_reported")
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Revenue"
        description={`Sales for ${scope.business.name}. Recorded by you, verified with your evidence.`}
      />

      {showMoment ? (
        <FirstRevenueMoment
          revenueRecordId={firstVerified.id}
          amountLabel={formatMoney(firstVerified.amount, firstVerified.currency)}
        />
      ) : null}

      {!firstVerified && hasUnverified ? (
        <p className="flex items-start gap-2 rounded-xl border border-dashed bg-card/50 px-4 py-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          You&apos;ve recorded a sale. Add evidence of payment to verify it and reach your
          First Revenue milestone.
        </p>
      ) : null}

      <section aria-labelledby="totals" className="space-y-3">
        <h2 id="totals" className="text-sm font-medium text-muted-foreground">
          Totals (per currency — never converted)
        </h2>
        {totals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No revenue recorded yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {totals.map((t) => (
              <dl key={t.currency} className="rounded-xl border bg-card p-5">
                <dt className="text-xs font-medium text-muted-foreground">
                  Verified · {t.currency}
                </dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(t.verified, t.currency)}
                </dd>
                <dd className="mt-2 text-xs text-muted-foreground">
                  Self-reported (unverified): {formatMoney(t.selfReported, t.currency)}
                  {t.refunded > 0
                    ? ` · Refunded: ${formatMoney(t.refunded, t.currency)}`
                    : ""}
                </dd>
              </dl>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section aria-labelledby="sales" className="space-y-3">
          <h2 id="sales" className="text-sm font-medium text-muted-foreground">
            Sales
          </h2>
          {records.length === 0 ? (
            <EmptyState
              icon={CircleDollarSignIcon}
              title="No sales yet"
              description="When someone pays you, record it here. Add evidence to verify it."
            />
          ) : (
            <RevenueList records={records} />
          )}
          {transitions.length > 0 ? (
            <div className="pt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <HandshakeIcon className="size-4" />
                Mode history
              </h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {transitions.map((t) => (
                  <li key={t.createdAt}>
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(new Date(t.createdAt))}
                    :{" "}
                    {t.toMode === "cofounder"
                      ? "Switched to AI Co-Founder Mode"
                      : "Switched to AI CEO Mode"}
                    {t.reason === "first_revenue"
                      ? " after first verified revenue"
                      : " (manual)"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Record a sale</CardTitle>
            <CardDescription>
              Only real payments you received. NanoCrab never adds revenue for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueForm
              defaultCurrency={profile?.budget?.currency ?? "USD"}
              today={today}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
