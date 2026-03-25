"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import type { PromptLibraryItem } from "@/types"

type Props = {
  prompt: PromptLibraryItem
}

export function PromptCard({ prompt }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt.prompt_text)
    setCopied(true)
    toast.success("Prompt copied!")

    // Fire-and-forget copy count increment
    fetch(`/api/prompts/${prompt.id}/copy`, { method: "POST" }).catch(() => {})

    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="group hover:border-red-500/50 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{prompt.title}</h3>
            <Badge variant="outline" className="mt-1 text-xs capitalize">
              {prompt.category}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={copied ? "border-green-500/50 text-green-500" : "border-red-500/30 text-red-500 hover:bg-red-500/10"}
          >
            {copied ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto">
          {prompt.prompt_text}
        </pre>

        {prompt.linked_content_id && (
          <Link
            href={`/content/${prompt.linked_content_id}`}
            className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline"
          >
            View related content <ExternalLink className="size-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
