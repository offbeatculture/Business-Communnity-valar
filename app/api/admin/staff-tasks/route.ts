import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireConsole } from "@/lib/auth/console-viewer"

const createSchema = z.object({
  member_user_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  is_completed: z.boolean(),
})

export async function GET(request: Request) {
  const guard = await requireConsole("/admin/tasks")
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const showDone = new URL(request.url).searchParams.get("done") === "1"
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("staff_tasks")
    .select("*")
    .eq("is_completed", showDone)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("Fetch staff tasks error:", error)
    return NextResponse.json({ error: "Failed to load follow-ups" }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const guard = await requireConsole("/admin/tasks")
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("staff_tasks")
    .insert({
      member_user_id: parsed.data.member_user_id,
      reason: parsed.data.reason,
      created_by: guard.viewer.userId,
    })
    .select()
    .single()

  if (error) {
    console.error("Create staff task error:", error)
    return NextResponse.json({ error: "Failed to add the follow-up" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const guard = await requireConsole("/admin/tasks")
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  // completed_at is handled by the staff_tasks_sync trigger, so it can
  // never disagree with is_completed.
  const { data, error } = await admin
    .from("staff_tasks")
    .update({
      is_completed: parsed.data.is_completed,
      completed_by: parsed.data.is_completed ? guard.viewer.userId : null,
    })
    .eq("id", parsed.data.id)
    .select()
    .single()

  if (error) {
    console.error("Update staff task error:", error)
    return NextResponse.json({ error: "Failed to update the follow-up" }, { status: 500 })
  }

  return NextResponse.json(data)
}
