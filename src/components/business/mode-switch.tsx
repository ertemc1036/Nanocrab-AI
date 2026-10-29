"use client"

import { ArrowLeftRightIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { OperatingMode } from "@/lib/nanocrab-ceo/types"

/** Manual mode switch — the founder is always in control, revenue or not. */
export function ModeSwitch({ mode }: { mode: OperatingMode }) {
  const target: OperatingMode = mode === "ceo" ? "cofounder" : "ceo"
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null)
  const [pending, startTransition] = useTransition()
  return (
    <div className="grid gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-fit">
            <ArrowLeftRightIcon />
            {target === "cofounder"
              ? "Switch to AI Co-Founder Mode"
              : "Switch back to AI CEO Mode"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target === "cofounder"
                ? "Take the lead as CEO?"
                : "Let NanoCrab lead again?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target === "cofounder"
                ? "NanoCrab will stop driving your plan and act as your AI Co-Founder. Usually this happens after your first verified revenue, but it's your call."
                : "NanoCrab will lead planning again as your AI CEO and propose your next steps. You still approve every change."}{" "}
              The switch is recorded in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await switchModeAction({
                    toMode: target,
                    reason: "manual",
                    revenueRecordId: null,
                    confirmed: true,
                  })
                  // The page re-renders in the new mode, so confirm with a toast.
                  if (r.ok) toast.success(r.message)
                  else setResult(r)
                })
              }
            >
              Confirm switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {result?.message ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={result.ok ? "text-xs text-success" : "text-xs text-destructive"}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  )
}
