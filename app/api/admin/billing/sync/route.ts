// Runs one step of the Razorpay → database sync. The admin page calls this
// repeatedly until it reports done; see lib/billing/sync.ts for why.

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { requireAdmin } from "@/lib/admin-audit"
import { readSyncState, runSyncStep } from "@/lib/billing/sync"

export const maxDuration = 60

const Body = z.object({
  start: z.boolean().optional(),
  mode: z.enum(["incremental", "full"]).optional(),
})

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  return NextResponse.json({ state: await readSyncState() })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = Body.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  try {
    const progress = await runSyncStep({
      start: parsed.data.start,
      mode: parsed.data.mode,
      budgetMs: 45_000,
    })
    return NextResponse.json(progress)
  } catch (err) {
    console.error("Billing sync step failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    )
  }
}
