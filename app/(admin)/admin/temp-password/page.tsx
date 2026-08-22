import Link from "next/link"
import { ArrowLeft, KeyRound } from "lucide-react"
import { TempPasswordClient } from "@/components/admin/TempPasswordClient"

export const dynamic = "force-dynamic"

export default function AdminTempPasswordPage() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="mt-5 flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="size-6 text-primary" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Security & Login Support
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Temporary Password
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Search a member and set a temporary password when they are unable
              to login.
            </p>
          </div>
        </div>
      </div>

      <TempPasswordClient />
    </div>
  )
}