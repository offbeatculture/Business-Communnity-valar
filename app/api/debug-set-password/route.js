import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  const admin = createAdminClient()

  const email = "anjusingh.parwarish@gmail.com"
  const temporaryPassword = "12345678"
  const userId = "02fa1f43-9ae9-4f34-932f-17dd3865f556"

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    email_confirm: true,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    email,
    userId,
    message: "Password set successfully",
  })
}