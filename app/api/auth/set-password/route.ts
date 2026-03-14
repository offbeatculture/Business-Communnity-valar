import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const setPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = setPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid password" },
        { status: 400 }
      )
    }

    const { password } = parsed.data

    // Require active Supabase session
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Set the password via the user's own session
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      console.error("Failed to set password:", updateError)
      return NextResponse.json(
        { error: "Failed to set password" },
        { status: 500 }
      )
    }

    // Mark password as set in profile
    const adminClient = createAdminClient()
    await adminClient
      .from("profiles")
      .update({ password_set: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)

    // Update onboarding session if exists
    await adminClient
      .from("onboarding_sessions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "user_created")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/auth/set-password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
