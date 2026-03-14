import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail } from "@/lib/ses"
import { rateLimit } from "@/lib/rate-limit"

const resendSchema = z.object({
  email: z.email("Invalid email address"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = resendSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    const { email } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Rate limit: 3 per email per 10 minutes
    const { allowed } = rateLimit({
      key: `resend:${normalizedEmail}`,
      limit: 3,
      windowMs: 10 * 60 * 1000,
    })

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()

    // Find user by email
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )

    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json({
        message: "If an account exists for this email, a login link has been sent.",
      })
    }

    // Check if user needs a magic link (password not yet set)
    const { data: profile } = await supabase
      .from("profiles")
      .select("password_set, full_name")
      .eq("user_id", user.id)
      .single()

    if (profile?.password_set === true) {
      // User already has a password — tell them to log in normally
      return NextResponse.json({
        message: "If an account exists for this email, a login link has been sent.",
      })
    }

    // Generate new magic link and send
    const rawToken = await createMagicLoginToken(user.id)
    await sendMagicLinkEmail({
      to: normalizedEmail,
      token: rawToken,
      name: profile?.full_name ?? undefined,
    })

    return NextResponse.json({
      message: "If an account exists for this email, a login link has been sent.",
    })
  } catch (error) {
    console.error("POST /api/auth/magic-link/resend error:", error)
    return NextResponse.json(
      { error: "Failed to resend login link" },
      { status: 500 }
    )
  }
}
