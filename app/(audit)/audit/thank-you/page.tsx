import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AuditThankYouPage() {
  return (
    <div className="space-y-6 text-center sm:text-left">
      <div className="flex justify-center sm:justify-start">
        <div className="rounded-full bg-primary/10 p-3">
          <CheckCircle2 className="size-8 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Thank you. Your answers are in.
        </h1>
        <p className="text-base text-muted-foreground max-w-prose">
          Swastik will personally review your audit and put together your 14-page
          report. You&apos;ll get it on WhatsApp and email within 48 hours.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium mb-2">While you wait:</p>
        <p className="text-sm text-muted-foreground">
          Have a glass of water. Step away from your screen for 10 minutes.
          You just did 7 minutes of clear thinking about your business — most
          owners don&apos;t do that all year.
        </p>
      </div>

      <Link href="/">
        <Button variant="outline">Back to home</Button>
      </Link>
    </div>
  )
}
