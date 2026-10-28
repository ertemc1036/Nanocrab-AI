import "server-only"

import { requireUser } from "@/lib/dal/auth"
import { DataAccessError } from "@/lib/dal/errors"
import { createClient } from "@/lib/supabase/server"

/**
 * Permanently deletes the signed-in user's account and all their data via the
 * `delete_my_account` database function (scoped to auth.uid()). No
 * service-role key is involved.
 */
export async function deleteMyAccount(): Promise<void> {
  await requireUser()
  const supabase = await createClient()

  const { error } = await supabase.rpc("delete_my_account")
  if (error) throw new DataAccessError("delete account", error)

  // The JWT stays valid until expiry; clear the local session cookies now.
  await supabase.auth.signOut({ scope: "local" })
}
