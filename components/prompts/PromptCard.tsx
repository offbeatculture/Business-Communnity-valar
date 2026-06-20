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
  Leaf,
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

const chip = "border-[#C89B3C]/25 bg-[#C89B3C]/10 text-[#8A6A22]"
const iconWrap = "bg-[#C89B3C]/10 text-[#8A6A22]"

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
    label: "Practice",
    icon: Leaf,
    chip,
    iconWrap,
  },
  strategy: {
    label: "Clarity",
    icon: Target,
    chip,
    iconWrap,
  },
  offer: {
    label: "Reflection",
    icon: Sparkles,
    chip,
    iconWrap,
  },
  leads: {
    label: "Awareness",
    icon: Megaphone,
    chip,
    iconWrap,
  },
  conversion: {
    label: "Balance",
    icon: BadgeDollarSign,
    chip,
    iconWrap,
  },
  ops: {
    label: "Routine",
    icon: BriefcaseBusiness,
    chip,
    iconWrap,
  },
  team: {
    label: "Community",
    icon: Users,
    chip,
    iconWrap,
  },
  money: {
    label: "Grounding",
    icon: BadgeDollarSign,
    chip,
    iconWrap,
  },
  moat: {
    label: "Inner Safety",
    icon: ShieldCheck,
    chip,
    iconWrap,
  },
  retention: {
    label: "Consistency",
    icon: Sparkles,
    chip,
    iconWrap,
  },
}

function getCategoryMeta(category: string) {
  return (
    CATEGORY_META[category] ?? {
      label: category,
      icon: FileText,
      chip,
      iconWrap,
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
    <Card className="group h-full overflow-hidden border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5 transition-all duration-200 hover:border-[#C89B3C]/40 hover:shadow-md hover:shadow-black/10">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconWrap}`}
            >
              <Icon className="size-5" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-serif text-lg font-semibold text-[#4B3A25]">
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
                ? "shrink-0 border-[#6F7358]/40 bg-[#E8DDC8] text-[#4B3A25] hover:bg-[#E8DDC8]"
                : "shrink-0 border-[#C89B3C]/30 bg-transparent text-[#8A6A22] hover:bg-[#C89B3C]/10 hover:text-[#4B3A25]"
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

        <div className="relative min-h-[150px] flex-1 overflow-hidden rounded-2xl border border-[#C89B3C]/20 bg-[#E8DDC8]/65 p-4">
          <p className="line-clamp-7 whitespace-pre-line text-sm leading-6 text-[#6F7358]">
            {prompt.prompt_text}
          </p>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#E8DDC8] to-transparent" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-[#6F7358]">Copy-ready practice prompt</p>

          {prompt.linked_content_id && (
            <Link
              href={`/content/${prompt.linked_content_id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#8A6A22] hover:underline"
            >
              Related content <ExternalLink className="size-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}