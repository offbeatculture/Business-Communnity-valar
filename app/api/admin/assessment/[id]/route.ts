import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  is_published: z.boolean().optional(),
})

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
  return profile?.role === "admin" ? user : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin.from("assessments").update(parsed.data).eq("id", id).select().single()
    if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 })

    return NextResponse.json(data)
  } catch (error) {
    console.error("PATCH /api/admin/assessment/[id] error:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const admin = createAdminClient()
    const { error } = await admin.from("assessments").delete().eq("id", id)
    if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/admin/assessment/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
