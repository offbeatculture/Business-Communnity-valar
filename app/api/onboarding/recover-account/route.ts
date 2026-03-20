import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { rateLimit } from "@/lib/rate-limit"
import { recoverAccount } from "@/lib/recovery"

const recoverSchema = z.object({
  email: z.email("Invalid email address"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = recoverSchema.safeParse(body)

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
      key: `recover:${normalizedEmail}`,
      limit: 3,
      windowMs: 10 * 60 * 1000,
    })

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      )
    }

    console.log(`[recover-account] Recovery attempt for ${normalizedEmail}`)

    const result = await recoverAccount({
      type: "email",
      email: normalizedEmail,
      sendEmail: true,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    console.error("POST /api/onboarding/recover-account error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
