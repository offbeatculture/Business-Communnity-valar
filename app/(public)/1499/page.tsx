

import { Footer } from "@/components/landing/Footer"
import { Hero2 } from "@/components/landing/Hero2"
export const authRequired = false
export const dynamic = "force-dynamic"
export default function Plan1499() {
 return (
    <div id="top" className="min-h-screen flex flex-col">
      <Hero2 />
      {/* <Features /> */}
      {/* <PricingSection /> */}
      <Footer />
    </div>
  )
}