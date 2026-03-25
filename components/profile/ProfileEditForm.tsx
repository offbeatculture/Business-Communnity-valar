"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Profile } from "@/types"
import { INDUSTRIES } from "@/types"

const BANNER_COLORS = [
  { value: "red", label: "Red", className: "bg-primary" },
  { value: "blue", label: "Blue", className: "bg-blue-500" },
  { value: "green", label: "Green", className: "bg-green-500" },
  { value: "purple", label: "Purple", className: "bg-purple-500" },
  { value: "orange", label: "Orange", className: "bg-orange-500" },
  { value: "amber", label: "Amber", className: "bg-amber-500" },
  { value: "teal", label: "Teal", className: "bg-teal-500" },
  { value: "pink", label: "Pink", className: "bg-pink-500" },
] as const

type Props = {
  profile: Profile
  memberLevel?: number
  redirectTo?: string
}

export function ProfileEditForm({ profile, memberLevel = 1, redirectTo = "/profile" }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [fullName, setFullName] = useState(profile.full_name ?? "")
  const [businessName, setBusinessName] = useState(profile.business_name ?? "")
  const [city, setCity] = useState(profile.city ?? "")
  const [industry, setIndustry] = useState(profile.industry ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [gstin, setGstin] = useState(profile.gstin ?? "")
  const [tagline, setTagline] = useState(profile.tagline ?? "")
  const [bannerColor, setBannerColor] = useState(profile.banner_color ?? "")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const initials = (fullName || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload failed")
      }

      const data = await res.json()
      setAvatarUrl(data.avatar_url)
      toast.success("Avatar updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error("Name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          business_name: businessName.trim() || null,
          city: city.trim() || null,
          industry: industry || null,
          bio: bio.trim() || null,
          gstin: gstin.trim() || null,
          tagline: tagline.trim() || null,
          banner_color: bannerColor || null,
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
      toast.error(error instanceof Error ? error.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar upload */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-20">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={fullName} />
            ) : null}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 transition-colors"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Camera className="size-3.5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Click the camera icon to upload a photo</p>
          <p>JPEG, PNG, or WebP. Max 2MB.</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Business Name</label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your business or company name"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Industry</label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">City</label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Your city"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">{bio.length}/500</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">GSTIN</label>
          <Input
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            placeholder="e.g. 27AABCU9603R1ZM"
            maxLength={15}
          />
        </div>

        {memberLevel >= 2 && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">Business Tagline</label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short tagline for your business"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Unlocked at Sprout level. Shows on your profile.
            </p>
          </div>
        )}

        {memberLevel >= 3 && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">Profile Banner Color</label>
            <div className="flex flex-wrap gap-2">
              {BANNER_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setBannerColor(color.value)}
                  className={`size-8 rounded-full ${color.className} ring-offset-2 ring-offset-background transition-all ${
                    bannerColor === color.value ? "ring-2 ring-primary scale-110" : "hover:scale-105"
                  }`}
                  title={color.label}
                />
              ))}
              {bannerColor && (
                <button
                  type="button"
                  onClick={() => setBannerColor("")}
                  className="text-xs text-muted-foreground hover:text-foreground px-2"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unlocked at Builder level. Customizes your profile header.
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving && <Loader2 className="size-4 animate-spin mr-2" />}
        Save Profile
      </Button>
    </form>
  )
}
