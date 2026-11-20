// Sync Karma Recode bootcamp videos from the Ops Playbook sheet.
//
// POST — the "Sync now" button on Admin → Karma Recode Content
//        (admins and recording admins).

import { NextResponse } from "next/server"
import { verifyContentAdmin } from "@/lib/auth/content-admin"
import { syncKarmaRecodeBootcamps } from "@/lib/kr-bootcamp-sync"

export const dynamic = "force-dynamic"
export const maxDuration = 60

async function run() {
  try {
    const report = await syncKarmaRecodeBootcamps()
    console.log("KR bootcamp sync:", JSON.stringify(report))
    return NextResponse.json(report)
  } catch (error) {
    console.error("KR bootcamp sync failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}

export async function POST() {
  const auth = await verifyContentAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  return run()
}
