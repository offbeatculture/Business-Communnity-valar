import { Hero } from "@/components/landing/Hero"
import { Features } from "@/components/landing/Features"
import { PricingSection } from "@/components/landing/PricingSection"
import { Footer } from "@/components/landing/Footer"

export default function LandingPage() {
  return (
    <div id="top" className="min-h-screen flex flex-col">
      <Hero />
      <Features />
      <PricingSection />
      <Footer />
    </div>
  )
}
