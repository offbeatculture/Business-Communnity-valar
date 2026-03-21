import { Suspense } from "react"
import PlansClient from "./plans-client"

export default function PlansPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PlansClient />
    </Suspense>
  )
}