import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchHighIntensityCount } from "@/lib/mano-mitra-server"
import { ManoMitraFlow } from "@/components/mano-mitra/ManoMitraFlow"

export const metadata = {
  title: "Mano Mitra — Your emotional companion",
}

export default async function ManoMitraPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const priorHighIntensity = await fetchHighIntensityCount(user.id)

  return <ManoMitraFlow priorHighIntensity={priorHighIntensity} />
}
