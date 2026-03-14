import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  return profile?.role === "admin" ? user : null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const admin = createAdminClient()

    // Determine which table to update by trying resources first
    const { data: resource } = await admin
      .from("resources")
      .select("id")
      .eq("id", id)
      .single()

    if (resource) {
      const { content_type, documents, remove_documents, ...updateData } = body

      // Remove specified documents
      if (Array.isArray(remove_documents) && remove_documents.length > 0) {
        // Get file paths before deleting rows
        const { data: docsToRemove } = await admin
          .from("resource_documents")
          .select("id, file_url")
          .eq("resource_id", id)
          .in("id", remove_documents)

        if (docsToRemove && docsToRemove.length > 0) {
          await admin.storage
            .from("resources")
            .remove(docsToRemove.map((d: { file_url: string }) => d.file_url))
            .catch(() => {})

          await admin
            .from("resource_documents")
            .delete()
            .in("id", docsToRemove.map((d: { id: string }) => d.id))
        }
      }

      // Add new documents
      if (Array.isArray(documents) && documents.length > 0) {
        // Get current max sort_order
        const { data: existing } = await admin
          .from("resource_documents")
          .select("sort_order")
          .eq("resource_id", id)
          .order("sort_order", { ascending: false })
          .limit(1)

        const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

        const docRows = documents.map((doc: { label: string; file_url: string; sort_order?: number }, i: number) => ({
          resource_id: id,
          label: doc.label,
          file_url: doc.file_url,
          sort_order: doc.sort_order ?? nextOrder + i,
        }))

        await admin.from("resource_documents").insert(docRows)
      }

      const { data: updated, error } = await admin
        .from("resources")
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Update resource error:", error)
        return NextResponse.json(
          { error: "Failed to update" },
          { status: 500 }
        )
      }

      return NextResponse.json(updated)
    }

    // Try video_summaries
    const { content_type, ...updateData } = body
    const { data: updated, error } = await admin
      .from("video_summaries")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update video summary error:", error)
      return NextResponse.json(
        { error: "Failed to update" },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update content error:", error)
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()

    // Try to delete from resources
    const { data: resource } = await admin
      .from("resources")
      .select("id, file_url")
      .eq("id", id)
      .single()

    if (resource) {
      // Delete file from storage if exists
      if (resource.file_url) {
        await admin.storage
          .from("resources")
          .remove([resource.file_url])
          .catch(() => {})
      }

      // Delete resource_documents files from storage
      const { data: docs } = await admin
        .from("resource_documents")
        .select("file_url")
        .eq("resource_id", id)

      if (docs && docs.length > 0) {
        const filePaths = docs.map((d) => d.file_url)
        await admin.storage
          .from("resources")
          .remove(filePaths)
          .catch(() => {})
      }
      // Rows auto-delete via ON DELETE CASCADE

      const { error } = await admin
        .from("resources")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Delete resource error:", error)
        return NextResponse.json(
          { error: "Failed to delete" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    // Try video_summaries
    const { error } = await admin
      .from("video_summaries")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Delete video summary error:", error)
      return NextResponse.json(
        { error: "Failed to delete" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete content error:", error)
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    )
  }
}
