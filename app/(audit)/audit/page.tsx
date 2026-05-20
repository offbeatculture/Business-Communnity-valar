import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function AuditLandingPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          The 7 Forces Business Audit
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
          A diagnosis of your business across the 8 forces of growth.
        </h1>
        <p className="text-base text-muted-foreground max-w-prose">
          16 questions. 7 minutes on your phone. You&apos;ll get a 14-page report
          that names the one force you should focus on for the next 90 days —
          and the named move to make.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-medium">What you&apos;ll need:</p>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li>· Rough numbers for revenue, gross margin, and cash runway</li>
          <li>· An honest read on how you spend your week</li>
          <li>· 7 quiet minutes</li>
        </ul>
        <p className="text-xs text-muted-foreground pt-1">
          Don&apos;t know an exact number? &quot;I don&apos;t track this&quot; is a valid answer.
        </p>
      </div>

      <Link href="/audit/form">
        <Button size="lg" className="w-full sm:w-auto">
          Start your audit
          <ArrowRight className="size-4" />
        </Button>
      </Link>
    </div>
  )
}
