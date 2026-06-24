"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Profile } from "@/types"

type EditableProfile = Profile & {
  phone?: string | null
}

type Props = {
  profile: EditableProfile
  memberLevel?: number
  redirectTo?: string
}

export function ProfileEditForm({
  profile,
  redirectTo = "/profile",
}: Props) {
  const router = useRouter()

  const [fullName, setFullName] = useState(profile.full_name ?? "")
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [city, setCity] = useState(profile.city ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error("Full name is required")
      return
    }

    const phoneDigits = phone.replace(/\D/g, "")

    if (phoneDigits && phoneDigits.length < 10) {
      toast.error("Enter a valid mobile number")
      return
    }

    setSaving(true)

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          bio: bio.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Save failed")
      }

      toast.success("Profile updated")
      router.push(redirectTo)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Full Name <span className="text-primary">*</span>
          </label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Mobile Number
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your mobile number"
            inputMode="tel"
            maxLength={15}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">City</label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter your city"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short bio about yourself..."
            rows={4}
            maxLength={300}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {bio.length}/300
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}