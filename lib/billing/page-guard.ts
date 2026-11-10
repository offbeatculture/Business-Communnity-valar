import "server-only"

import { redirect } from "next/navigation"
import { getConsoleViewer } from "@/lib/auth/console-viewer"
import { STAFF_HOME } from "@/lib/auth/console"

/**
 * Billing pages are admins only: they show what every member paid and can
 * change memberships. Staff are sent to their own overview. The nav hides
 * these links too, but that's presentation — this is the check.
 */
export async function requireBillingAdmin() {
  const viewer = await getConsoleViewer()
  if (!viewer) redirect("/dashboard")
  if (!viewer.isAdmin) redirect(STAFF_HOME)
  return viewer
}
