import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRenewalPricePaise } from "@/lib/billing/renewal-price"
import { RenewClient } from "./RenewClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Renew your membership" }

// Expired members are sent here straight after login (see middleware.ts).
// The price shown is the member's own renewal price — the same one the
// checkout charges.
export default async function RenewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const pricePaise = await getRenewalPricePaise(supabase, user.id)
  return <RenewClient priceRupees={pricePaise / 100} />
}
