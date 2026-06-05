"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import type { PromptLibraryItem } from "@/types"

type Props = {
  prompt: PromptLibraryItem
}

const CATEGORY_META: Record<
  string,
  {
    label: string
    icon: React.ElementType
    chip: string
    iconWrap: string
  }
> = {
  sales: {
    label: "Sales",
    icon: BadgeDollarSign,
    chip: "border-red-500/20 bg-red-500/10 text-red-500",
    iconWrap: "bg-red-500/10 text-red-500",
  },
  strategy: {
    label: "Strategy",
    icon: Target,
    chip: "border-blue-500/20 bg-blue-500/10 text-blue-500",
    iconWrap: "bg-blue-500/10 text-blue-500",
  },
  offer: {
    label: "Offer",
    icon: Target,
    chip: "border-orange-500/20 bg-orange-500/10 text-orange-500",
    iconWrap: "bg-orange-500/10 text-orange-500",
  },
  leads: {
    label: "Leads",
    icon: Megaphone,
    chip: "border-purple-500/20 bg-purple-500/10 text-purple-500",
    iconWrap: "bg-purple-500/10 text-purple-500",
  },
  conversion: {
    label: "Conversion",
    icon: BadgeDollarSign,
    chip: "border-green-500/20 bg-green-500/10 text-green-500",
    iconWrap: "bg-green-500/10 text-green-500",
  },
  ops: {
    label: "Ops",
    icon: BriefcaseBusiness,
    chip: "border-sky-500/20 bg-sky-500/10 text-sky-500",
    iconWrap: "bg-sky-500/10 text-sky-500",
  },
  team: {
    label: "Team",
    icon: Users,
    chip: "border-indigo-500/20 bg-indigo-500/10 text-indigo-500",
    iconWrap: "bg-indigo-500/10 text-indigo-500",
  },
  money: {
    label: "Money",
    icon: BadgeDollarSign,
    chip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    iconWrap: "bg-emerald-500/10 text-emerald-500",
  },
  moat: {
    label: "Moat",
    icon: ShieldCheck,
    chip: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
    iconWrap: "bg-yellow-500/10 text-yellow-600",
  },
  retention: {
    label: "Retention",
    icon: Sparkles,
    chip: "border-pink-500/20 bg-pink-500/10 text-pink-500",
    iconWrap: "bg-pink-500/10 text-pink-500",
  },
}

function getCategoryMeta(category: string) {
  return (
    CATEGORY_META[category] ?? {
      label: category,
      icon: FileText,
      chip: "border-border bg-muted text-muted-foreground",
      iconWrap: "bg-muted text-muted-foreground",
    }
  )
}

export function PromptCard({ prompt }: Props) {
  const [copied, setCopied] = useState(false)

  const meta = getCategoryMeta(prompt.category)
  const Icon = meta.icon

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt.prompt_text)
    setCopied(true)
    toast.success("Prompt copied!")

    fetch(`/api/prompts/${prompt.id}/copy`, { method: "POST" }).catch(() => {})

    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="group h-full overflow-hidden border-border/60 bg-card transition-all duration-200 hover:border-primary/35 hover:shadow-md hover:shadow-primary/5">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconWrap}`}
            >
              <Icon className="size-5" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">
                {prompt.title}
              </h3>

              <span
                className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${meta.chip}`}
              >
                {meta.label}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={
              copied
                ? "shrink-0 border-green-500/50 text-green-500 hover:bg-green-500/10"
                : "shrink-0 border-primary/30 text-primary hover:bg-primary/10"
            }
          >
            {copied ? (
              <Check className="mr-1 size-3.5" />
            ) : (
              <Copy className="mr-1 size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="relative min-h-[150px] flex-1 overflow-hidden rounded-2xl border border-border/50 bg-muted/30 p-4">
          <p className="line-clamp-7 whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {prompt.prompt_text}
          </p>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/80 to-transparent" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Copy-ready AI prompt
          </p>

          {prompt.linked_content_id && (
            <Link
              href={`/content/${prompt.linked_content_id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Related content <ExternalLink className="size-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}