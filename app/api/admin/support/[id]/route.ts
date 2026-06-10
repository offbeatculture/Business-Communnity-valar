import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const replySchema = z.object({
  admin_reply: z.string().min(1, "Reply is required").max(2000),
  status: z.enum(["open", "in_progress", "closed"]).default("closed"),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = replySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reply", details: parsed.error.issues },
        { status: 400 }
      )
    }

const admin = createAdminClient()

const { error } = await admin
  .from("support_queries")
  .update({
    admin_reply: parsed.data.admin_reply,
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  })
  .eq("id", id)

if (error) {
  console.error("Support reply update error:", error)
  return NextResponse.json(
    { error: "Failed to update support query" },
    { status: 500 }
  )
}

// Fetch query owner to notify them
const { data: supportQuery } = await admin
  .from("support_queries")
  .select("user_id, category")
  .eq("id", id)
  .single()

if (supportQuery?.user_id) {
  await admin.from("notifications").insert({
    user_id: supportQuery.user_id,
    type: "support_reply",
    title: "Support replied to your query",
    message: "Our team has replied to your support query.",
    link_url: "/support",
    entity_type: "support_query",
    entity_id: id,
    is_read: false,
  })
}

return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/admin/support/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update support query" },
      { status: 500 }
    )
  }
}