import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"

const createSupportQuerySchema = z.object({
  category: z.string().min(1).max(80),
  message: z.string().min(3).max(2000).optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createSupportQuerySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid support query",
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const { category, message } = parsed.data

    const { error } = await supabase.from("support_queries").insert({
      user_id: user.id,
      category,
      message: message ?? null,
      status: "open",
    })

    if (error) {
      console.error("Create support query error:", error)
      return NextResponse.json(
        { error: "Failed to submit support query" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Your query has been submitted. Our team will get back to you quickly.",
    })
  } catch (error) {
    console.error("POST /api/support/queries error:", error)

    return NextResponse.json(
      { error: "Failed to submit support query" },
      { status: 500 }
    )
  }
}