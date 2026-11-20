import "server-only"

// Karma Recode bootcamps — sync from the Ops Playbook sheet.
//
// The ops team keeps the bootcamp recordings in the "8 Bootcamps YT Links" tab:
//   column C  Bootcamp   e.g. "1. Root Chakra Bootcamp"
//   column D  Session    the video title
//   column E  Link       YouTube link (filled in as each recording is ready)
//
// Each run (Admin → Karma Recode Content → Sync now):
//   - each bootcamp gets its own Karma Recode folder (created once, found again
//     by its slug, so renaming the folder in the admin is safe);
//   - every row with a YouTube link that isn't in the portal yet is added to
//     that bootcamp's folder, published;
//   - a video already in that folder gets its title refreshed from the sheet.
// Nothing is ever deleted. Rows without a link are ignored until one is added.
//
// The sheet is read through its public CSV export ("anyone with the link can
// view"), so no Google credentials are needed.

import { createAdminClient } from "@/lib/supabase/admin"
import { extractVideoId } from "@/lib/youtube-oembed"

const SHEET_ID = "12v0uyB5omtVg-uIMY-vk7HliQbORbVbdTC9RAZmMZl4"
const SHEET_GID = "1565283394"
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`

/**
 * Videos are listed newest-first in the portal. Giving each row a created_at
 * counted back from this fixed moment keeps them in sheet order (session 1 on
 * top), even for links added weeks later.
 */
const ORDER_ANCHOR = Date.UTC(2026, 10, 20, 0, 0, 0)

export type BootcampSyncReport = {
  foldersCreated: string[]
  added: { bootcamp: string; title: string }[]
  retitled: { bootcamp: string; title: string }[]
  skipped: { bootcamp: string; title: string; reason: string }[]
  waitingForLink: number
}

type SheetRow = { bootcamp: string; session: string; link: string; row: number }

/** Minimal RFC 4180 CSV parser (handles quotes, commas and newlines in cells). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else {
      cell += ch
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

const tidy = (s: string) => s.replace(/\s+/g, " ").trim()

/** Fix the sheet's recurring "Affrimation" typo in titles. */
const cleanTitle = (s: string) => tidy(s).replace(/affrimation/gi, "Affirmation")

/** "1. Root Chakra Bootcamp" → 1; falls back to the order bootcamps appear in. */
function bootcampNumber(name: string, fallback: number): number {
  const m = name.match(/^(\d+)\s*[.)-]/)
  return m ? Number(m[1]) : fallback
}

function bootcampSlug(name: string, n: number): string {
  return `kr-bootcamp-sheet-${n}`.concat(
    /^\d+\s*[.)-]/.test(name)
      ? ""
      : "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  )
}

async function readSheet(): Promise<SheetRow[]> {
  const res = await fetch(CSV_URL, { cache: "no-store", redirect: "follow" })
  if (!res.ok) throw new Error(`Could not read the bootcamp sheet (HTTP ${res.status})`)
  const type = res.headers.get("content-type") ?? ""
  if (!type.includes("text/csv")) {
    throw new Error("The bootcamp sheet is not shared as 'anyone with the link can view'")
  }

  const rows = parseCsv(await res.text())
  const out: SheetRow[] = []
  // The team often fills the Bootcamp cell only on a bootcamp's first row, so a
  // blank cell means "same bootcamp as the row above". A fully blank row ends it.
  let current = ""
  rows.forEach((cells, i) => {
    const named = tidy(cells[2] ?? "")
    const session = cleanTitle(cells[3] ?? "")
    const link = tidy(cells[4] ?? "")
    if (!named && !session && !link) {
      current = ""
      return
    }
    if (/^bootcamp$/i.test(named)) return // header
    if (named) current = named
    if (!current || !session) return
    out.push({ bootcamp: current, session, link, row: i + 1 })
  })
  return out
}

export async function syncKarmaRecodeBootcamps(): Promise<BootcampSyncReport> {
  const rows = await readSheet()
  const admin = createAdminClient()

  const report: BootcampSyncReport = {
    foldersCreated: [],
    added: [],
    retitled: [],
    skipped: [],
    waitingForLink: rows.filter((r) => !r.link).length,
  }

  // Bootcamps in sheet order.
  const bootcamps = [...new Set(rows.map((r) => r.bootcamp))]

  // Each bootcamp's folder — found by slug, created when missing.
  const folderIdByBootcamp = new Map<string, string>()
  for (const [i, name] of bootcamps.entries()) {
    const n = bootcampNumber(name, i + 1)
    const slug = bootcampSlug(name, n)

    const { data: existing } = await admin
      .from("content_folders")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (existing) {
      folderIdByBootcamp.set(name, existing.id)
      continue
    }

    const { data: created, error } = await admin
      .from("content_folders")
      .insert({
        name,
        slug,
        description: "Karma Recode bootcamp recordings.",
        is_karma_recode: true,
        parent_id: null,
        sort_order: 10 + n,
      })
      .select("id")
      .single()

    if (error || !created) throw new Error(`Could not create folder "${name}": ${error?.message}`)
    folderIdByBootcamp.set(name, created.id)
    report.foldersCreated.push(name)
  }

  // Rows that have a usable YouTube link.
  const linked = rows
    .filter((r) => r.link)
    .map((r) => ({ ...r, videoId: extractVideoId(r.link) }))

  for (const r of linked.filter((r) => !r.videoId)) {
    report.skipped.push({ bootcamp: r.bootcamp, title: r.session, reason: `Not a YouTube link: ${r.link}` })
  }

  const withIds = linked.filter((r): r is typeof r & { videoId: string } => Boolean(r.videoId))
  if (withIds.length === 0) return report

  const { data: existingVideos, error: readError } = await admin
    .from("video_summaries")
    .select("id, youtube_video_id, folder_id, title")
    .in("youtube_video_id", withIds.map((r) => r.videoId))
  if (readError) throw new Error(`Could not read existing videos: ${readError.message}`)

  const existingById = new Map((existingVideos ?? []).map((v) => [v.youtube_video_id as string, v]))
  const seen = new Set<string>()
  const toInsert: Record<string, unknown>[] = []

  for (const r of withIds) {
    const folderId = folderIdByBootcamp.get(r.bootcamp)!
    if (seen.has(r.videoId)) {
      report.skipped.push({ bootcamp: r.bootcamp, title: r.session, reason: "Same link appears twice in the sheet" })
      continue
    }
    seen.add(r.videoId)

    const existing = existingById.get(r.videoId)
    if (existing) {
      if (existing.folder_id !== folderId) {
        report.skipped.push({ bootcamp: r.bootcamp, title: r.session, reason: "Already in another portal folder" })
      } else if (existing.title !== r.session) {
        await admin.from("video_summaries").update({ title: r.session }).eq("id", existing.id)
        report.retitled.push({ bootcamp: r.bootcamp, title: r.session })
      }
      continue
    }

    toInsert.push({
      folder_id: folderId,
      title: r.session,
      youtube_url: r.link,
      youtube_video_id: r.videoId,
      category: "recordings",
      is_published: true,
      created_at: new Date(ORDER_ANCHOR - r.row * 60_000).toISOString(),
    })
    report.added.push({ bootcamp: r.bootcamp, title: r.session })
  }

  if (toInsert.length > 0) {
    const { error } = await admin.from("video_summaries").insert(toInsert)
    if (error) throw new Error(`Could not save the new videos: ${error.message}`)
  }

  return report
}
