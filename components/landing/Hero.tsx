import Link from "next/link"
import { Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
      <div className="max-w-xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Rocket className="text-primary size-9 shrink-0" />
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-[#E53935] to-[#FF6D00] bg-clip-text text-transparent">
            Superhuman Entrepreneur
          </h1>
        </div>

        <p className="text-xl sm:text-2xl font-semibold mb-3">
          Own Your Growth
        </p>
        <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto">
          The exclusive community for business owners who want to build, scale
          &amp; exit like a founder.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <Link href="/login">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
