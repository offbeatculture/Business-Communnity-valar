import Link from "next/link"
import { Rocket } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t py-8 px-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Rocket className="text-primary size-5" />
          <span className="font-semibold text-sm">SuperFounder</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          {/* <Link href="/login" className="hover:text-foreground transition-colors">
            Log In
          </Link> */}
          {/* <Link href="#pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link> */}
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} SuperFounder
        </p>
      </div>
    </footer>
  )
}
