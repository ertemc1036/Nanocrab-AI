"use client"

import { CrownIcon, PartyPopperIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { switchModeAction } from "@/app/(app)/revenue/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/** The signature First Revenue moment. The switch only happens on explicit confirmation. */
export function FirstRevenueMoment({
  revenueRecordId,
  amountLabel,
}: {
  revenueRecordId: string
  amountLabel: string
}) {
  const [hidden, setHidden] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  if (hidden) return null

  return (
    <section
      aria-labelledby="first-revenue"
      className="border-gradient bg-glow relative overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-12"
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
        <PartyPopperIcon className="size-6 text-primary" />
      </div>
      <h2
        id="first-revenue"
        className="text-gradient-brand mx-auto mt-5 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
      >
        Congratulations. You made your first revenue.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-base text-balance">
        You&apos;re officially taking the lead. NanoCrab is now your AI Co-Founder.
      </p>
      <p className="mx-auto mt-3 max-w-lg text-xs text-muted-foreground">
        First verified sale: {amountLabel}. A first sale is a real milestone — it
        doesn&apos;t yet mean the business is viable or profitable. That&apos;s what
        you&apos;ll work on next, together.
      </p>
      {result?.ok ? (
        <p role="status" className="mt-6 text-sm font-medium text-success">
          {result.message}
        </p>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-11 px-6 font-semibold"
            onClick={() => setConfirming(true)}
          >
            <CrownIcon />
            Become the CEO
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-11"
            onClick={() => setHidden(true)}
          >
            Not now
          </Button>
        </div>
      )}
      {result && !result.ok ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {result.message}
        </p>
      ) : null}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to AI Co-Founder Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll lead the business as CEO. NanoCrab stops driving the plan and
              supports you with analysis and recommendations when you ask. You can switch
              back at any time from My Business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setResult(
                    await switchModeAction({
                      toMode: "cofounder",
                      reason: "first_revenue",
                      revenueRecordId,
                      confirmed: true,
                    })
                  )
                })
              }
            >
              Yes, I&apos;m the CEO now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
