import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { rateLimit } from "@/lib/rate-limit"
import { recoverAccount } from "@/lib/recovery"

const openSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = openSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      )
    }

    const { sessionId } = parsed.data

    // Rate limit: 5 per session per 10 minutes
    const { allowed } = rateLimit({
      key: `open:${sessionId}`,
      limit: 5,
      windowMs: 10 * 60 * 1000,
    })

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      )
    }

    console.log(`[open-account] Open attempt for session ${sessionId}`)

    const result = await recoverAccount({
      type: "sessionId",
      sessionId,
      sendEmail: false,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      message: result.message,
      redirectUrl: result.redirectUrl,
    })
  } catch (error) {
    console.error("POST /api/onboarding/open-account error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
