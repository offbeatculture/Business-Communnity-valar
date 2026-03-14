import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

export const TOKEN_EXPIRY_MINUTES = 20

export function generateMagicToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex")
  const hash = crypto.createHash("sha256").update(raw).digest("hex")
  return { raw, hash }
}

export async function createMagicLoginToken(userId: string): Promise<string> {
  const supabase = createAdminClient()
  const { raw, hash } = generateMagicToken()

  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

  // Invalidate any existing unused tokens for this user
  await supabase
    .from("magic_login_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("used_at", null)

  // Store the hashed token
  const { error } = await supabase.from("magic_login_tokens").insert({
    user_id: userId,
    token_hash: hash,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    throw new Error(`Failed to create magic login token: ${error.message}`)
  }

  return raw
}

export async function verifyMagicToken(
  rawToken: string
): Promise<{ userId: string; email: string } | null> {
  const supabase = createAdminClient()
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex")

  // Find matching unused token
  const { data: token, error } = await supabase
    .from("magic_login_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", hash)
    .is("used_at", null)
    .single()

  if (error || !token) return null

  // Check expiry
  if (new Date(token.expires_at) < new Date()) return null

  // Mark as used
  await supabase
    .from("magic_login_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", token.id)

  // Look up user email
  const { data: userData } = await supabase.auth.admin.getUserById(token.user_id)
  if (!userData?.user?.email) return null

  return { userId: token.user_id, email: userData.user.email }
}
