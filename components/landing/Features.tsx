import { BookOpen, Sparkles, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: BookOpen,
    title: "Content Library",
    desc: "Curated cheat sheets, templates & frameworks to accelerate your business growth.",
  },
  {
    icon: Sparkles,
    title: "AI Summaries",
    desc: "Watch less, learn more. AI-powered video summaries distilled into actionable insights.",
  },
  {
    icon: Users,
    title: "Community",
    desc: "Connect with ambitious founders. Share wins, ask questions & grow together.",
  },
] as const

export function Features() {
  return (
    <section className="px-4 pb-20 max-w-4xl mx-auto w-full">
      <div className="grid gap-6 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardContent>
              <Icon className="text-primary mb-3 size-7" />
              <h3 className="text-lg font-semibold mb-1">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
