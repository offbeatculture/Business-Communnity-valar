import { Suspense } from "react"
import PaymentSuccessClient from "./payment-success-client"

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PaymentSuccessClient />
    </Suspense>
  )
}