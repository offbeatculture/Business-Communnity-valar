"use client"

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

type RazorpayInstance = {
  open(): void
  on(event: string, handler: () => void): void
}

type RazorpayOptions = {
  key: string
  amount?: number
  currency?: string
  name: string
  description: string
  order_id?: string
  subscription_id?: string
  prefill?: { email?: string; name?: string }
  theme?: { color?: string }
  handler: (response: RazorpayResponse) => void
  modal?: { ondismiss?: () => void }
}

export type RazorpayResponse = {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_subscription_id?: string
  razorpay_signature: string
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay"))
    document.body.appendChild(script)
  })
}

export type CheckoutParams = {
  orderId: string
  amount: number
  currency?: string
  planLabel: string
  userEmail?: string
  userName?: string
}

export async function openRazorpayCheckout(
  params: CheckoutParams,
  onSuccess: (data: { paymentId: string; orderId: string }) => void,
  onFailure: (error: string) => void
): Promise<void> {
  await loadRazorpayScript()

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!key) {
    onFailure("Razorpay is not configured yet.")
    return
  }

  const options: RazorpayOptions = {
    key,
    amount: params.amount,
    currency: params.currency ?? "INR",
    name: "Superhuman Entrepreneur",
    description: params.planLabel,
    order_id: params.orderId,
    prefill: {
      email: params.userEmail,
      name: params.userName,
    },
    theme: { color: "#E53935" },
    handler: async (response: RazorpayResponse) => {
      try {
        const res = await fetch("/api/razorpay/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          onFailure(data.error ?? "Payment verification failed")
          return
        }
        onSuccess({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id ?? params.orderId,
        })
      } catch {
        onFailure("Payment verification failed. Contact support.")
      }
    },
    modal: {
      ondismiss: () => onFailure("Payment cancelled"),
    },
  }

  const rzp = new window.Razorpay(options)
  rzp.open()
}

// =============================================
// Subscription checkout (recurring / autopay)
// =============================================

type SubscriptionCheckoutParams = {
  subscriptionId: string
  sessionId: string       // ← add this
  userEmail?: string
  userName?: string
}

export async function openRazorpaySubscriptionCheckout(
  params: SubscriptionCheckoutParams,
  onSuccess: (data: { paymentId: string; subscriptionId: string }) => void,
  onFailure: (error: string) => void
): Promise<void> {
  await loadRazorpayScript()

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!key) {
    onFailure("Razorpay is not configured yet.")
    return
  }

  const options: RazorpayOptions = {
    key,
    name: "Superhuman Entrepreneur",
    description: "Monthly Subscription — ₹499/mo",
    subscription_id: params.subscriptionId,
    prefill: {
      email: params.userEmail,
      name: params.userName,
    },
    theme: { color: "#E53935" },
    handler: async (response: RazorpayResponse) => {
  try {
    const res = await fetch("/api/onboarding/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_subscription_id: response.razorpay_subscription_id,
        razorpay_signature: response.razorpay_signature,
        session_id: params.sessionId,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      onFailure(data.error ?? "Payment verification failed")
      return
    }
    onSuccess({
      paymentId: response.razorpay_payment_id,
      subscriptionId: response.razorpay_subscription_id ?? params.subscriptionId,
    })
  } catch {
    onFailure("Payment verification failed. Contact support.")
  }
},
    modal: {
      ondismiss: () => onFailure("Payment cancelled"),
    },
  }

  const rzp = new window.Razorpay(options)
  rzp.open()
}
