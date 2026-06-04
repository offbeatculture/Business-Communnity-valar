import { createAdminClient } from "@/lib/supabase/admin"

type CreateNotificationInput = {
  userId: string
  actorId?: string | null
  type: string
  title: string
  message?: string | null
  linkUrl?: string | null
  entityType?: string | null
  entityId?: string | null
}

export async function createNotification(input: CreateNotificationInput) {
  const admin = createAdminClient()

  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    actor_id: input.actorId ?? null,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    link_url: input.linkUrl ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  })

  if (error) {
    console.error("Create notification error:", error)
  }
}