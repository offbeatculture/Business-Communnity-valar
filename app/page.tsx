import { createClient } from "@/lib/supabase/server"
import { Hero } from "@/components/landing/Hero"
import { Features } from "@/components/landing/Features"
import { PricingSection } from "@/components/landing/PricingSection"
import { Footer } from "@/components/landing/Footer"

export default async function LandingPage() {
  const supabase = await createClient()
  const { count } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())

  return (
    <div className="min-h-screen flex flex-col">
      <Hero />
      <Features />
      <PricingSection activeCount={count ?? 0} />
      <Footer />
    </div>
  )
}
