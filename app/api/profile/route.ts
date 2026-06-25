import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { awardPoints } from "@/lib/engagement"
import { GP_VALUES } from "@/lib/engagement-constants"

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      console.error("GET profile error:", error)
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json({
        id: "",
        user_id: user.id,
        full_name:
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "",
        phone: "",
        city: "",
        bio: "",
        role: "member",
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("GET /api/profile error:", error)

    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

const payload = {
  user_id: user.id,
  role: "member",
  ...parsed.data,
  updated_at: new Date().toISOString(),
}

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    let profile
    let error

    if (existingProfile) {
      const result = await admin
        .from("profiles")
        .update(payload)
        .eq("user_id", user.id)
        .select("*")
        .single()

      profile = result.data
      error = result.error
    } else {
      const result = await admin
        .from("profiles")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single()

      profile = result.data
      error = result.error
    }

    if (error) {
      console.error("Profile save error:", error)

      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 }
      )
    }

    if (profile?.full_name && profile?.city) {
      const { data: alreadyAwarded } = await admin
        .from("engagement_log")
        .select("id")
        .eq("user_id", user.id)
        .eq("action", "profile_setup")
        .limit(1)
        .maybeSingle()

      if (!alreadyAwarded) {
        await awardPoints(user.id, "profile_setup", GP_VALUES.profile_setup)
      }
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("PATCH /api/profile error:", error)

    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    )
  }
}