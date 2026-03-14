import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  business_name: z.string().max(100).nullable().optional(),
  industry: z.string().max(50).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  gstin: z.string().max(15).nullable().optional(),
  tagline: z.string().max(100).nullable().optional(),
  banner_color: z.string().max(20).nullable().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("GET /api/profile error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("*")
      .single()

    if (error) {
      console.error("Update profile error:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("PATCH /api/profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
