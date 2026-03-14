import { NextRequest, NextResponse } from "next/server"
import { verifyMagicToken } from "@/lib/magic-link"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url))
  }

  // Verify the custom magic link token
  const result = await verifyMagicToken(token)

  if (!result) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_or_expired_token", request.url)
    )
  }

  // Bridge to Supabase session: generate a Supabase magic link
  const supabase = createAdminClient()
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: result.email,
    })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("Failed to generate Supabase magic link:", linkError)
    return NextResponse.redirect(
      new URL("/login?error=session_creation_failed", request.url)
    )
  }

  // Redirect through the existing /auth/confirm route to create the Supabase session
  const confirmUrl = new URL("/auth/confirm", request.url)
  confirmUrl.searchParams.set("token_hash", linkData.properties.hashed_token)
  confirmUrl.searchParams.set("type", "magiclink")
  confirmUrl.searchParams.set("next", "/set-password")

  return NextResponse.redirect(confirmUrl)
}
