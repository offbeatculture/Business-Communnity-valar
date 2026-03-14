import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CurrentPlanCard } from "@/components/subscription/CurrentPlanCard"
import { PaymentHistory } from "@/components/subscription/PaymentHistory"
import { RenewButton } from "@/components/subscription/RenewButton"
import type { Subscription, Invoice } from "@/types"

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single()

  // Latest active subscription
  const { data: latestSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .single()

  // All subscriptions for history
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const isExpired = !latestSub?.expires_at || new Date(latestSub.expires_at) < new Date()

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Subscription</h1>

      <CurrentPlanCard subscription={(latestSub as Subscription) ?? null} />

      <PaymentHistory
        subscriptions={(subscriptions as Subscription[]) ?? []}
        invoices={(invoices as Invoice[]) ?? []}
      />

      {isExpired && (
        <div className="mt-4">
          <p className="text-muted-foreground text-sm mb-3">
            Your subscription has expired. Renew to continue accessing all features.
          </p>
          <RenewButton
            planId="monthly"
            userEmail={user.email}
            userName={profile?.full_name ?? undefined}
          />
        </div>
      )}
    </div>
  )
}
