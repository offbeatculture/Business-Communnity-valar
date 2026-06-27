"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Profile } from "@/types"

type Props = {
  profile: Profile
  memberLevel?: number
  redirectTo?: string
}

export function ProfileEditForm({
  profile,
  redirectTo = "/profile",
}: Props) {
  const router = useRouter()

  const [fullName, setFullName] = useState(profile.full_name ?? "")
  const [phone, setPhone] = useState((profile as any).phone ?? "")
  const [city, setCity] = useState(profile.city ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [saving, setSaving] = useState(false)

  const labelClass = "mb-1.5 block text-sm font-medium text-white/90"

  const inputClass =
    "border-white/25 bg-white/5 text-white placeholder:text-white/55 focus-visible:border-white focus-visible:ring-white/70 focus-visible:ring-offset-0"

  const textareaClass =
    "min-h-28 border-white/25 bg-white/5 text-white placeholder:text-white/55 focus-visible:border-white focus-visible:ring-white/70 focus-visible:ring-offset-0"

  const helperClass = "mt-1 text-xs text-white/60"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error("Full name is required")
      return
    }

    if (phone.trim() && phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid mobile number")
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
      className="rounded-[2rem] border border-white/10 bg-[#123d22] p-5 text-white shadow-lg sm:p-8"
    >
      <div className="space-y-5">
        <div>
          <label className={labelClass}>
            Full Name <span className="text-white">*</span>
          </label>

          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Mobile Number</label>

          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your mobile number"
            inputMode="tel"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>City</label>

          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter your city"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Bio</label>

          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short bio about yourself..."
            maxLength={300}
            className={textareaClass}
          />

          <p className={helperClass}>{bio.length}/300</p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#c99a2e] px-7 text-[#102719] hover:bg-[#d8ad45]"
        >
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}