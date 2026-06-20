import { BookOpen, HeartPulse, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: BookOpen,
    title: "Breathwork Library",
    desc: "Guided practices, worksheets, and session resources to support your daily breathwork journey.",
  },
  {
    icon: HeartPulse,
    title: "Daily Practice Support",
    desc: "Simple breathwork practices for calmness, clarity, emotional balance, and inner wellbeing.",
  },
  {
    icon: Users,
    title: "Breathwork Community",
    desc: "Connect with members, share reflections, ask questions, and grow with Dr. Valarmathi Srinivasan’s guidance.",
  },
] as const

export function Features() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-20">
      <div className="grid gap-6 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card
            key={title}
            className="border-teal-500/20 bg-card transition-colors hover:border-teal-400/40 hover:bg-teal-500/5"
          >
            <CardContent>
              <Icon className="mb-3 size-7 text-teal-300" />

              <h3 className="mb-1 text-lg font-semibold">{title}</h3>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}