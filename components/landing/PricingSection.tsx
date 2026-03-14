import { Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function PricingSection() {
  const features = [
    "Full content library",
    "AI-powered video summaries",
    "Community access",
  ]

  return (
    <section className="px-4 pb-20 max-w-4xl mx-auto w-full" id="pricing">
      <h2 className="text-3xl font-bold text-center mb-2">
        Simple, Transparent Pricing
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        One plan. Everything included.
      </p>

      <div className="max-w-sm mx-auto">
        <Card className="ring-2 ring-primary">
          <CardContent>
            <p className="text-sm text-muted-foreground mb-1">Monthly</p>
            <p className="text-4xl font-bold mb-1">
              ₹499
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-xs text-muted-foreground mb-1">+ 18% GST</p>
            <p className="text-xs text-muted-foreground mb-4">Autopay enabled &middot; Cancel anytime</p>

            <ul className="space-y-2 mb-6 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="size-4 text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button className="w-full" asChild>
              <a href="#top">Get Started</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
