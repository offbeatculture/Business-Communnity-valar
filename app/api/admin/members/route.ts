import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchAllMembers } from "@/lib/profile"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || undefined
    const industry = searchParams.get("industry") || undefined
    const status = (searchParams.get("status") as "active" | "expired" | "all") || "all"
    const page = parseInt(searchParams.get("page") ?? "1", 10)

    const result = await fetchAllMembers({ search, industry, status, page, perPage: 20 })

    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/admin/members error:", error)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}
