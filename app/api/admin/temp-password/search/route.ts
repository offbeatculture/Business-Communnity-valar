import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type ProfileRow = {
  user_id: string
  full_name: string | null
  phone: string | null
  role: string | null
}

async function verifyAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      error: "Unauthorized",
      status: 401,
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return {
      user: null,
      error: "Forbidden",
      status: 403,
    }
  }

  return {
    user,
    error: null,
    status: 200,
  }
}

function getMetadataValue(
  metadata: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!metadata) return ""

  for (const key of keys) {
    const value = metadata[key]

    if (typeof value === "string" && value.trim()) {
      return value
    }
  }

  return ""
}

export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin()

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim().toLowerCase()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Please enter at least 2 characters." },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const [{ data: profilesData }, usersResult] = await Promise.all([
      admin.from("profiles").select("user_id, full_name, phone, role"),
      admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),
    ])

    const profiles = (profilesData ?? []) as ProfileRow[]
    const profileMap = new Map<string, ProfileRow>()

    profiles.forEach((profile) => {
      profileMap.set(profile.user_id, profile)
    })

    const users =
      usersResult.data?.users
        ?.map((user) => {
          const profile = profileMap.get(user.id)

          const metadataName = getMetadataValue(user.user_metadata, [
            "full_name",
            "name",
            "display_name",
          ])

          const metadataPhone = getMetadataValue(user.user_metadata, [
            "phone",
            "mobile",
            "mobile_number",
            "contact",
            "contact_number",
          ])

          const name = profile?.full_name || metadataName || ""
          const phone = profile?.phone || user.phone || metadataPhone || ""
          const email = user.email || ""

          return {
            id: user.id,
            email,
            name,
            phone,
            searchable: `${email} ${name} ${phone}`.toLowerCase(),
          }
        })
        .filter((user) => user.searchable.includes(query))
        .slice(0, 20)
        .map(({ searchable, ...user }) => user) ?? []

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Temp password search error:", error)

    return NextResponse.json(
      { error: "Failed to search users." },
      { status: 500 }
    )
  }
}