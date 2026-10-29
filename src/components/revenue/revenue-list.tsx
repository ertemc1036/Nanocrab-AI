"use client"

import {
  BadgeCheckIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react"
import { useActionState, useState, useTransition } from "react"

import {
  deleteRevenueAction,
  refundRevenueAction,
  verifyRevenueAction,
} from "@/app/(app)/revenue/actions"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatMoney } from "@/lib/format"
import type { RevenueRecord } from "@/lib/nanocrab-ceo/types"
import { cn } from "@/lib/utils"
import { initialFormState } from "@/lib/validation/form"

const STATUS = {
  self_reported: { label: "Self-reported", className: "text-warning border-warning/40" },
  verified: {
    label: "Verified with evidence",
    className: "text-success border-success/40",
  },
  refunded: { label: "Refunded", className: "text-muted-foreground" },
} as const

export function RevenueList({ records }: { records: RevenueRecord[] }) {
  return (
    <ul className="space-y-2">
      {records.map((r) => (
        <RevenueRow key={r.id} record={r} />
      ))}
    </ul>
  )
}

function RevenueRow({ record }: { record: RevenueRecord }) {
  const [verifying, setVerifying] = useState(false)
  const [confirm, setConfirm] = useState<"refund" | "delete" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [state, formAction] = useActionState(
    async (prev: Awaited<ReturnType<typeof verifyRevenueAction>>, fd: FormData) => {
      const result = await verifyRevenueAction(prev, fd)
      if (result.status === "success") setVerifying(false)
      return result
    },
    initialFormState
  )
  const s = STATUS[record.status]

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card p-4",
        pending && "opacity-60"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p
            className={cn(
              "text-base font-semibold tabular-nums",
              record.status === "refunded" && "line-through"
            )}
          >
            {formatMoney(record.amount, record.currency)}
          </p>
          <p className="text-sm break-words">{record.item}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className={s.className}>
            {record.status === "verified" ? <BadgeCheckIcon /> : null}
            {s.label}
          </Badge>
          <span>{record.saleDate}</span>
          {record.customerReference ? <span>· {record.customerReference}</span> : null}
        </div>
        {record.evidenceNote || record.evidenceUrl ? (
          <p className="mt-1.5 text-xs break-words text-muted-foreground">
            Evidence: {record.evidenceNote}
            {record.evidenceUrl ? (
              <>
                {record.evidenceNote ? " · " : ""}
                <a
                  href={record.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary underline underline-offset-2"
                >
                  link
                </a>
              </>
            ) : null}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Options for ${record.item}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {record.status !== "verified" ? (
            <DropdownMenuItem onSelect={() => setVerifying(true)}>
              <BadgeCheckIcon />
              Verify with evidence
            </DropdownMenuItem>
          ) : null}
          {record.status !== "refunded" ? (
            <DropdownMenuItem onSelect={() => setConfirm("refund")}>
              <RotateCcwIcon />
              Mark as refunded
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={verifying} onOpenChange={setVerifying}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify this sale</DialogTitle>
            <DialogDescription>
              Add evidence that the payment happened — a payment reference, invoice
              number, or a link to the transaction. NanoCrab records that <em>you</em>{" "}
              verified it; it doesn&apos;t check payment providers.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid gap-4" noValidate>
            <FormAlert state={state.status === "error" ? state : { status: "idle" }} />
            <input type="hidden" name="id" value={record.id} />
            <FormField
              name="evidenceNote"
              label="Payment reference or receipt"
              maxLength={1000}
              defaultValue={state.values?.evidenceNote ?? record.evidenceNote}
              error={state.fieldErrors?.evidenceNote}
            />
            <FormField
              name="evidenceUrl"
              label="Link (optional)"
              type="url"
              placeholder="https://"
              defaultValue={state.values?.evidenceUrl ?? record.evidenceUrl ?? ""}
              error={state.fieldErrors?.evidenceUrl}
            />
            <div>
              <SubmitButton pendingLabel="Saving…">Mark as verified</SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete" ? "Delete this sale?" : "Mark as refunded?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete"
                ? "The record is removed permanently. If the money was returned, mark it refunded instead to keep an honest history."
                : "Refunded sales stay in your history but don't count as revenue."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirm === "delete"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : undefined
              }
              onClick={() =>
                startTransition(async () => {
                  const r =
                    confirm === "delete"
                      ? await deleteRevenueAction(record.id)
                      : await refundRevenueAction(record.id)
                  if (!r.ok) setError(r.message ?? "Something went wrong.")
                })
              }
            >
              {confirm === "delete" ? "Delete" : "Mark refunded"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
