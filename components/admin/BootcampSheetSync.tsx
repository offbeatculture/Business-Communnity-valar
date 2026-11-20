"use client"

import { useState } from "react"
import { ExternalLink, Loader2, RefreshCw, Sheet } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/12v0uyB5omtVg-uIMY-vk7HliQbORbVbdTC9RAZmMZl4/edit?gid=1565283394"

type Report = {
  foldersCreated: string[]
  added: { bootcamp: string; title: string }[]
  retitled: { bootcamp: string; title: string }[]
  skipped: { bootcamp: string; title: string; reason: string }[]
  waitingForLink: number
}

/** Pulls new bootcamp links from the Ops Playbook sheet right now. */
export function BootcampSheetSync({ onSynced }: { onSynced: () => void }) {
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<Report | null>(null)

  async function sync() {
    setBusy(true)
    try {
      const res = await fetch("/api/cron/kr-bootcamps", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Sync failed")
      setLast(data)
      toast.success(
        data.added.length
          ? `Added ${data.added.length} video${data.added.length === 1 ? "" : "s"} from the sheet`
          : "Everything in the sheet is already here"
      )
      onSynced()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Sheet className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Bootcamps from the Ops sheet</p>
              <p className="text-sm text-muted-foreground">
                Each bootcamp gets its own folder. After new links are added to the sheet, press
                Sync now to bring them in.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={SHEET_URL} target="_blank" rel="noreferrer">
                Open sheet <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button size="sm" onClick={sync} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Sync now
            </Button>
          </div>
        </div>

        {last && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p>
              Added <strong>{last.added.length}</strong>
              {last.foldersCreated.length > 0 && <> · new folders: {last.foldersCreated.join(", ")}</>}
              {last.retitled.length > 0 && <> · retitled {last.retitled.length}</>}
              {" · "}
              {last.waitingForLink} session{last.waitingForLink === 1 ? "" : "s"} still waiting for a link
            </p>
            {last.added.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {last.added.map((a) => (
                  <li key={a.bootcamp + a.title}>
                    {a.bootcamp}: {a.title}
                  </li>
                ))}
              </ul>
            )}
            {last.skipped.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-amber-700 dark:text-amber-400">
                {last.skipped.map((s) => (
                  <li key={s.bootcamp + s.title}>
                    {s.bootcamp}: {s.title} — {s.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
