import { Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function PricingSection() {
  const features = [
    "Guided breathwork sessions with Dr. Valarmathi Srinivasan",
    "Community-led daily practice from Monday to Friday",
    "Simple practices for calmness and emotional balance",
    "Immediate access to recordings and practice guidance",
  ]

  return (
    <section
      className="w-full bg-[#122015] px-4 py-20 text-[#F7F0E3]"
      id="pricing"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#C89B3C]">
            Join the daily practice
          </p>

          <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            It&apos;s time to make this permanent.
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#E8DDC8]/70">
            One monthly membership with guided breathwork, recordings, community
            support, and a rhythm that helps you stay consistent.
          </p>
        </div>

        <div className="mx-auto max-w-sm">
          <Card className="border-[#C89B3C]/25 bg-[#1F2A1B] text-[#F7F0E3] shadow-2xl shadow-black/25">
            <CardContent className="p-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#C89B3C]">
                Monthly Membership
              </p>

              <p className="mb-1 text-5xl font-bold tracking-tight">
                ₹999
                <span className="ml-1 text-sm font-normal text-[#E8DDC8]/55">
                  /month
                </span>
              </p>

              <p className="mb-1 text-xs text-[#E8DDC8]/60">
                GST-inclusive monthly membership.
              </p>

              <p className="mb-5 text-xs text-[#E8DDC8]/55">
                Autopay enabled &middot; Cancel anytime
              </p>

              <div className="my-5 h-px bg-[#E8DDC8]/15" />

              <ul className="mb-6 space-y-3 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[#E8DDC8]/75">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#C89B3C]/15">
                      <Check className="size-3.5 text-[#D8B76A]" />
                    </span>
                    <span className="leading-6">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="h-11 w-full rounded-full bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]"
                asChild
              >
                <a href="#top">Join The Daily Practice</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}