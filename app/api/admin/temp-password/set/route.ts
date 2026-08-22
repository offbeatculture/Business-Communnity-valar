import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const SetTempPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(6),
})

async function verifyAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      error: "Unauthorized",
      status: 401,
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return {
      user: null,
      error: "Forbidden",
      status: 403,
    }
  }

  return {
    user,
    error: null,
    status: 200,
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin()

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const body = await request.json()
    const parsed = SetTempPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid user or password." },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const { userId, password } = parsed.data

    const { data: userData, error: getUserError } =
      await admin.auth.admin.getUserById(userId)

    if (getUserError || !userData.user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      )
    }

    const { error: updateError } =
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      })

    if (updateError) {
      console.error("Set temp password error:", updateError)

      return NextResponse.json(
        { error: updateError.message || "Failed to set password." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Temporary password set successfully.",
      user: {
        id: userData.user.id,
        email: userData.user.email,
      },
    })
  } catch (error) {
    console.error("Temp password set API error:", error)

    return NextResponse.json(
      { error: "Failed to set temporary password." },
      { status: 500 }
    )
  }
}