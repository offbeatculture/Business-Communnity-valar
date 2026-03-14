"use client"

import { useState } from "react"
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
import { Upload, Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import type { Category } from "@/types"

type Props = {
  categories: Category[]
  onSuccess: () => void
}

export function TemplateForm({ categories, onSuccess }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [externalUrl, setExternalUrl] = useState("")
  const [documents, setDocuments] = useState<{ label: string; file: File | null }[]>([
    { label: "", file: null },
  ])
  const [loading, setLoading] = useState(false)

  function addDocument() {
    setDocuments((prev) => [...prev, { label: "", file: null }])
  }

  function removeDocument(index: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  function updateDocument(index: number, field: "label" | "file", value: string | File | null) {
    setDocuments((prev) =>
      prev.map((doc, i) => (i === index ? { ...doc, [field]: value } : doc))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title || !category) {
      toast.error("Title and category are required")
      return
    }

    const validDocs = documents.filter((d) => d.label && d.file)

    if (!externalUrl && validDocs.length === 0 && !documents[0]?.file) {
      toast.error("Provide either a URL or upload files")
      return
    }

    setLoading(true)

    try {
      let filePath: string | undefined
      const uploadedDocs: { label: string; file_url: string; sort_order: number }[] = []

      if (validDocs.length > 0) {
        for (let i = 0; i < validDocs.length; i++) {
          const doc = validDocs[i]
          const formData = new FormData()
          formData.append("file", doc.file!)

          const uploadRes = await fetch("/api/admin/content/upload", {
            method: "POST",
            body: formData,
          })

          if (!uploadRes.ok) {
            const err = await uploadRes.json()
            throw new Error(err.error || `Upload failed for ${doc.label}`)
          }

          const { path } = await uploadRes.json()
          uploadedDocs.push({ label: doc.label, file_url: path, sort_order: i })
        }

        filePath = uploadedDocs[0].file_url
      } else if (documents[0]?.file) {
        const formData = new FormData()
        formData.append("file", documents[0].file)

        const uploadRes = await fetch("/api/admin/content/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          throw new Error(err.error || "Upload failed")
        }

        const { path } = await uploadRes.json()
        filePath = path
      }

      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: "resource",
          title,
          description: description || undefined,
          category,
          type: "template",
          file_url: filePath,
          external_url: externalUrl || undefined,
          is_published: true,
          documents: uploadedDocs.length > 0 ? uploadedDocs : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create")
      }

      toast.success("Template created!")
      setTitle("")
      setDescription("")
      setCategory("")
      setExternalUrl("")
      setDocuments([{ label: "", file: null }])
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. One-Page Business Plan Template"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Description (optional)
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this template..."
          rows={3}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">
          External URL (optional)
        </label>
        <Input
          type="url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://docs.google.com/..."
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Or upload documents (PDF or HTML)
        </label>
        <div className="space-y-3">
          {documents.map((doc, index) => (
            <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Label (e.g. Interactive Diagnostic)"
                  value={doc.label}
                  onChange={(e) => updateDocument(index, "label", e.target.value)}
                />
                <Input
                  type="file"
                  accept="application/pdf,text/html,.html"
                  onChange={(e) =>
                    updateDocument(index, "file", e.target.files?.[0] ?? null)
                  }
                />
                {doc.file && (
                  <p className="text-xs text-muted-foreground">
                    {doc.file.name} ({(doc.file.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>
              {documents.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeDocument(index)}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={addDocument}
        >
          <Plus className="size-4 mr-1" />
          Add another document
        </Button>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <Loader2 className="size-4 animate-spin mr-2" />
        ) : (
          <Upload className="size-4 mr-2" />
        )}
        {loading ? "Creating..." : "Create Template"}
      </Button>
    </form>
  )
}
