import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("extend_subscription"),
    days: z.number().int().min(1).max(365),
  }),
  z.object({
    action: z.literal("remove_member"),
  }),
])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (adminProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = actionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Fetch target member's profile to get user_id
    const { data: memberProfile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("id", profileId)
      .single()

    if (!memberProfile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const memberUserId = memberProfile.user_id

    if (parsed.data.action === "extend_subscription") {
      // Find the latest subscription
      const { data: latestSub } = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", memberUserId)
        .order("expires_at", { ascending: false })
        .limit(1)
        .single()

      // Calculate new expiry
      const now = new Date()
      const baseDate = latestSub && new Date(latestSub.expires_at) > now
        ? new Date(latestSub.expires_at)
        : now

      const newExpiry = new Date(baseDate)
      newExpiry.setDate(newExpiry.getDate() + parsed.data.days)

      // Insert new subscription record
      const { error: insertError } = await admin
        .from("subscriptions")
        .insert({
          user_id: memberUserId,
          razorpay_payment_id: `admin_extend_${Date.now()}`,
          plan_name: `Admin Extension (${parsed.data.days} days)`,
          amount_paid: 0,
          currency: "INR",
          status: "active",
          starts_at: now.toISOString(),
          expires_at: newExpiry.toISOString(),
        })

      if (insertError) {
        console.error("Extend subscription error:", insertError)
        return NextResponse.json({ error: "Failed to extend subscription" }, { status: 500 })
      }

      return NextResponse.json({ message: "Subscription extended", expires_at: newExpiry.toISOString() })
    }

    if (parsed.data.action === "remove_member") {
      // Delete the user — cascades via ON DELETE CASCADE
      const { error: deleteError } = await admin.auth.admin.deleteUser(memberUserId)

      if (deleteError) {
        console.error("Remove member error:", deleteError)
        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
      }

      return NextResponse.json({ message: "Member removed" })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("PATCH /api/admin/members/[id] error:", error)
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 })
  }
}
