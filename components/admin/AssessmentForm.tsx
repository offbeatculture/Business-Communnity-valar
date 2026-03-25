"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
import { Loader2, Plus } from "lucide-react"

type Props = {
  onDone?: () => void
}

export function AssessmentForm({ onDone }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [scoringType, setScoringType] = useState("generic")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !slug.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim(),
          scoring_type: scoringType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed")
      }

      toast.success("Assessment created")
      setTitle("")
      setSlug("")
      setDescription("")
      router.refresh()
      onDone?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create assessment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sales Closing Assessment" />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Slug (URL-safe)</label>
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))}
          placeholder="e.g. sales-closing"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description shown on the assessments page"
          rows={2}
          className="resize-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Scoring Type</label>
        <Select value={scoringType} onValueChange={setScoringType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="generic">Generic (simple percentage)</SelectItem>
            <SelectItem value="scale-code">Scale Code (8 pillars + archetypes)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={!title.trim() || !slug.trim() || isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Plus className="size-4 mr-1.5" />}
        Create Assessment
      </Button>
    </form>
  )
}
