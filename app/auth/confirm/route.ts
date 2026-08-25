import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")
  const next = searchParams.get("next")

  const supabase = await createClient()

  const destination = next ?? (type === "recovery" ? "/set-password" : "/dashboard")

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL(destination, request.url))
    }
    console.error("verifyOtp failed:", error.message)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next ?? "/set-password", request.url))
    }
    console.error("exchangeCodeForSession failed:", error.message)
  }

  console.error("auth/confirm: no valid params", { token_hash: !!token_hash, type, code: !!code })
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("Reset link is invalid or expired. Please request a new one.")}`, request.url)
  )
}
