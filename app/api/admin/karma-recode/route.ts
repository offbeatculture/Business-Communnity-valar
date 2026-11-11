// Add, update or remove a Karma Recode member (Admin → Members → Karma Recode).

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAdminAction, requireAdmin } from "@/lib/admin-audit"
import { karmaRecodeExpiry } from "@/lib/karma-recode"
import { findUserIdByEmail, syncKarmaRecodeMembership } from "@/lib/karma-recode-admin"

const Upsert = z.object({
  email: z.email().transform((e) => e.trim().toLowerCase()),
  name: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  // YYYY-MM-DD. Access runs a year from here (or from 1 June 2026 if earlier).
  purchasedOn: z.iso.date().optional().nullable(),
  // Only to override the calculated end date.
  expiresAt: z.iso.datetime({ offset: true }).optional().nullable(),
})

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = Upsert.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  }
  const { email, name, phone, purchasedOn } = parsed.data
  const expiresAt = parsed.data.expiresAt ?? karmaRecodeExpiry(purchasedOn ?? null)

  const admin = createAdminClient()
  const { data: before } = await admin.from("karma_recode_members").select("*").eq("email", email).maybeSingle()
  const { data: row, error } = await admin
    .from("karma_recode_members")
    .upsert({ email, name: name || null, phone: phone || null, purchased_on: purchasedOn ?? null, expires_at: expiresAt })
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Their Lifinity membership runs for the same year.
  const userId = await findUserIdByEmail(email)
  let membership: Awaited<ReturnType<typeof syncKarmaRecodeMembership>> | null = null
  if (userId) {
    try {
      membership = await syncKarmaRecodeMembership(userId, expiresAt)
    } catch (err) {
      return NextResponse.json(
        { error: `Saved to the Karma Recode list, but their membership wasn't updated: ${err instanceof Error ? err.message : err}` },
        { status: 500 }
      )
    }
  }

  await logAdminAction({
    adminUserId: auth.userId,
    adminEmail: auth.email,
    targetUserId: userId,
    action: before ? "karma_recode_update" : "karma_recode_add",
    detail: { before, after: row, membership },
  })

  return NextResponse.json({ ok: true, member: row, hasAccount: !!userId, membership })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: before } = await admin.from("karma_recode_members").select("*").eq("email", email).maybeSingle()
  const { error } = await admin.from("karma_recode_members").delete().eq("email", email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminAction({
    adminUserId: auth.userId,
    adminEmail: auth.email,
    targetUserId: await findUserIdByEmail(email),
    action: "karma_recode_remove",
    detail: { before },
  })
  return NextResponse.json({ ok: true })
}
