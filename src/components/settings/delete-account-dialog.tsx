"use client"

import { Trash2Icon } from "lucide-react"
import { useActionState, useState } from "react"

import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { deleteAccountAction } from "@/app/(app)/settings/actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { initialFormState } from "@/lib/validation/form"

export function DeleteAccountDialog() {
  const [state, formAction] = useActionState(deleteAccountAction, initialFormState)
  const [confirmation, setConfirmation] = useState("")

  return (
    <AlertDialog onOpenChange={(open) => !open && setConfirmation("")}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2Icon />
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction} className="grid gap-5">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account, agents, memories and conversations.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormAlert state={state} />
          <FormField
            name="confirmation"
            label='Type "DELETE" to confirm'
            autoComplete="off"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            error={state.fieldErrors?.confirmation}
          />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <SubmitButton
              variant="destructive"
              disabled={confirmation !== "DELETE"}
              pendingLabel="Deleting…"
            >
              Delete account
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
