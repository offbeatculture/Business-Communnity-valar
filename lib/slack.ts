type ValarPaymentAlertInput = {
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  amountPaise: number
  paymentType: "New Payment" | "New Subscription" | "Renewal"
  source: "Razorpay"
  razorpayPaymentId?: string | null
  razorpaySubscriptionId?: string | null
}

const VALAR_PAYMENT_ALERT_AMOUNT_PAISE = 99900

function formatAmount(amountPaise: number) {
  return `₹${Math.round(amountPaise / 100).toLocaleString("en-IN")}`
}

export async function sendValarPaymentAlert({
  customerName,
  customerEmail,
  customerPhone,
  amountPaise,
  paymentType,
  source,
  razorpayPaymentId,
  razorpaySubscriptionId,
}: ValarPaymentAlertInput) {
  if (amountPaise !== VALAR_PAYMENT_ALERT_AMOUNT_PAISE) {
    return
  }

  const webhookUrl = process.env.SLACK_VALAR_PAYMENT_ALERT_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn("Slack Valar payment alert webhook URL is missing")
    return
  }

  const name = customerName || "Customer"
  const email = customerEmail || "No email"
  const phone = customerPhone || "No phone"
  const amount = formatAmount(amountPaise)

  const text = [
    "🎉 Valar Payment Alert",
    "",
    `Customer: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Amount: ${amount}`,
    `Type: ${paymentType}`,
    `Source: ${source}`,
    razorpayPaymentId ? `Payment ID: ${razorpayPaymentId}` : null,
    razorpaySubscriptionId ? `Subscription ID: ${razorpaySubscriptionId}` : null,
    "Status: Paid",
  ]
    .filter(Boolean)
    .join("\n")

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
    }),
  })

  if (!response.ok) {
    const responseText = await response.text()

    console.error("Slack Valar payment alert failed:", {
      status: response.status,
      response: responseText,
    })
  }
}