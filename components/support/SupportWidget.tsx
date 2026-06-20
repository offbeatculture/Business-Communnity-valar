"use client"

import { useState } from "react"
import {
  CircleHelp,
  CreditCard,
  FileQuestion,
  KeyRound,
  Loader2,
  MessageCircle,
  Send,
  Video,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type SupportOption = {
  id: string
  label: string
  icon: React.ElementType
  reply: string
  needsInput?: boolean
}

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    id: "payment_subscription",
    label: "Payment / subscription",
    icon: CreditCard,
    reply:
      "Please check your subscription page first. If payment was deducted but access is not active, choose Other and send your registered email or payment screenshot details.",
  },
  {
    id: "content_access",
    label: "Recordings / content access",
    icon: Video,
    reply:
      "Recordings and resources are available inside the Breathwork Library. If a video or PDF is not loading, choose Other and mention the resource name.",
  },
  {
    id: "login_password",
    label: "Login / password",
    icon: KeyRound,
    reply:
      "Use the login or reset password option first. If you still cannot access your account, choose Other and mention your registered email.",
  },
  {
    id: "assessment_report",
    label: "Check-in / report",
    icon: FileQuestion,
    reply:
      "Self check-in results appear under Self Check-ins after completion. If your result is missing, choose Other and mention which check-in you completed.",
  },
  {
    id: "community_post",
    label: "Community / post issue",
    icon: MessageCircle,
    reply:
      "You can create reflections, comment, like, and save inside the Breathwork Community. If something is not working, choose Other and describe the issue.",
  },
  {
    id: "other",
    label: "Other query",
    icon: CircleHelp,
    reply:
      "Please write your query below. Our team will look into it and get back to you quickly.",
    needsInput: true,
  },
]

export function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SupportOption | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function submitQuery() {
    if (!selected) return

    const trimmed = message.trim()

    if (selected.needsInput && trimmed.length < 3) {
      toast.error("Please write your query before submitting.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/support/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selected.id,
          message: selected.needsInput ? trimmed : selected.reply,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit query")
        return
      }

      setSubmitted(true)
      toast.success("Support query submitted")
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function resetAndClose() {
    setOpen(false)
    setSelected(null)
    setMessage("")
    setSubmitted(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-full text-[#4B3A25] transition hover:bg-[#C89B3C]/10 hover:text-[#8A6A22]"
        aria-label="Support"
      >
        <CircleHelp className="size-5" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[330px] overflow-hidden rounded-2xl border border-[#C89B3C]/25 bg-[#F7F0E3] text-[#4B3A25] shadow-xl shadow-black/15 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-[#C89B3C]/20 px-4 py-3">
            <div>
              <p className="font-serif text-xl font-semibold text-[#4B3A25]">
                Support
              </p>
              <p className="text-xs font-medium text-[#6F7358]">
                Select your query type
              </p>
            </div>

            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-lg p-2 text-[#4B3A25] transition hover:bg-[#C89B3C]/10 hover:text-[#8A6A22]"
              aria-label="Close support"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-4">
            {submitted ? (
              <div className="rounded-2xl border border-[#C89B3C]/25 bg-[#C89B3C]/10 p-4 text-center">
                <p className="font-semibold text-[#8A6A22]">
                  Query submitted
                </p>

                <p className="mt-1 text-sm text-[#6F7358]">
                  Our team will look into this and get back to you quickly.
                </p>

                <Button
                  type="button"
                  size="sm"
                  className="mt-4 rounded-full bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]"
                  onClick={resetAndClose}
                >
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {SUPPORT_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isActive = selected?.id === option.id

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelected(option)
                          setSubmitted(false)
                          setMessage("")
                        }}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                          isActive
                            ? "border-[#C89B3C]/45 bg-[#C89B3C]/10 text-[#8A6A22]"
                            : "border-[#C89B3C]/20 bg-[#FFF8EA] text-[#4B3A25] hover:border-[#C89B3C]/40 hover:bg-[#E8DDC8]"
                        }`}
                      >
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                            isActive
                              ? "bg-[#C89B3C] text-[#122015]"
                              : "bg-[#E8DDC8] text-[#6F7358]"
                          }`}
                        >
                          <Icon className="size-4" />
                        </div>

                        <span className="text-sm font-semibold">
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {selected && (
                  <div className="mt-4 rounded-2xl border border-[#C89B3C]/20 bg-[#FFF8EA] p-4">
                    <p className="text-sm font-medium leading-6 text-[#6F7358]">
                      {selected.reply}
                    </p>

                    {selected.needsInput && (
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Write your query here..."
                        className="mt-3 min-h-28 resize-none rounded-2xl border-[#C89B3C]/25 bg-[#F7F0E3] text-[#4B3A25] placeholder:text-[#6F7358]/70 focus-visible:ring-[#C89B3C]"
                        maxLength={2000}
                      />
                    )}

                    <Button
                      type="button"
                      onClick={submitQuery}
                      disabled={loading}
                      className="mt-3 w-full rounded-full bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]"
                    >
                      {loading ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 size-4" />
                      )}
                      {selected.needsInput
                        ? "Submit query"
                        : "Send this to support"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}