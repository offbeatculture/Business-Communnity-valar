import { Lock, Sparkles } from "lucide-react"
import { LibraryView, type LibraryParams } from "@/components/content/LibraryView"
import { getKarmaRecodeAccess } from "@/lib/karma-recode"

export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<LibraryParams> }

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })

export default async function KarmaRecodePage({ searchParams }: Props) {
  const access = await getKarmaRecodeAccess()

  if (!access.canView) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-[#C89B3C]/30 bg-[#F7F0E3] p-8 text-center text-[#4B3A25]">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#C89B3C]/15">
          <Lock className="size-5 text-[#8A6A22]" />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold">Karma Recode</h1>
        <p className="mt-2 text-sm leading-6 text-[#6F7358]">
          {access.member
            ? `Your Karma Recode access ended on ${fmt(access.member.expiresAt)}. Please contact the team to renew.`
            : "This section is for Karma Recode members. If you've joined Karma Recode and can't see your content, please contact the team."}
        </p>
      </div>
    )
  }

  return (
    <div>
      {access.member?.active && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#C89B3C]/30 bg-[#F7F0E3] px-4 py-2.5 text-sm text-[#4B3A25]">
          <Sparkles className="size-4 shrink-0 text-[#8A6A22]" />
          <span>
            Your Karma Recode access runs until <strong>{fmt(access.member.expiresAt)}</strong>.
          </span>
        </div>
      )}
      <LibraryView params={await searchParams} scope="karma_recode" />
    </div>
  )
}
