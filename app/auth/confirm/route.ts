import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/set-password"

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }

    console.error("verifyOtp failed:", error.message)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }

    console.error("exchangeCodeForSession failed:", error.message)
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent(
        "Reset link is invalid or expired. Please request a new one."
      )}`,
      requestUrl.origin
    )
  )
}