import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit } from "@/lib/rate-limit"

const startSchema = z.object({
  email: z.email("Invalid email address"),
  planId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = startSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    const { email } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Rate limit: 5 requests per email per 15 minutes
    const { allowed } = rateLimit({
      key: `onboarding:${normalizedEmail}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()

    // Check if email already has an active subscription
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )

    if (existingUser) {
      const { data: activeSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .limit(1)
        .single()

      if (activeSub) {
        return NextResponse.json(
          { error: "This email already has an active subscription. Please log in instead." },
          { status: 409 }
        )
      }
    }

    // Clean up expired sessions for this email
    await supabase
      .from("onboarding_sessions")
      .delete()
      .eq("email", normalizedEmail)
      .eq("plan_id", parsed.data.planId ?? "monthly")
      .lt("expires_at", new Date().toISOString())

    // Check for an existing pending/payment_pending session
    const { data: existingSession } = await supabase
      .from("onboarding_sessions")
      .select("id, status, expires_at")
      .eq("email", normalizedEmail)
      .in("status", ["pending", "payment_pending"])
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (existingSession) {
      return NextResponse.json({ sessionId: existingSession.id })
    }

    // Create new onboarding session (2-hour expiry)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

    const { data: session, error } = await supabase
      .from("onboarding_sessions")
      .insert({
        email: normalizedEmail,
         plan_id: parsed.data.planId ?? "monthly",
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      console.error("Failed to create onboarding session:", error)
      return NextResponse.json(
        { error: "Failed to start onboarding" },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("POST /api/onboarding/start error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
