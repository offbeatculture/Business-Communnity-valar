"use client"

// ============================================================
// AssessmentBulkInviteForm — admin uploads a CSV and issues
// many assessment invites at once. POSTs to /api/admin/invites/bulk.
//
// CSV columns (header row, case-insensitive):
//   email, full_name, phone, vertical
// Only `email` and `full_name` are required.
//
// Per-row validation happens client-side BEFORE upload so the
// admin sees what they're about to do. Per-row results from the
// server come back after — duplicates / invalids / errors are
// surfaced individually with a one-shot "Copy link" button when
// the admin chose not to auto-email.
// ============================================================

import { useCallback, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Upload,
  X,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VERTICALS } from "@/lib/audit/types"
import type {
  BulkInviteRequest,
  BulkInviteResponse,
  BulkInviteResult,
} from "@/types/assessment"

const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VERTICAL_VALUES = new Set<string>(VERTICALS.map((v) => v.value))
const MAX_ROWS = 500

type ParsedRow = {
  email: string
  full_name: string
  phone: string
  vertical: string
  // Client-side validation
  email_ok: boolean
  name_ok: boolean
  phone_ignored: boolean // present but invalid
  vertical_ignored: boolean // present but invalid
}

type Props = {
  onIssued: () => void
}

// ── CSV parser (tiny, handles quoted values with commas inside) ──

function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"'
        i += 2
        continue
      }
      if (ch === '"') {
        inQuotes = false
        i++
        continue
      }
      cell += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ",") {
      row.push(cell)
      cell = ""
      i++
      continue
    }
    if (ch === "\r") {
      i++
      continue
    }
    if (ch === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      i++
      continue
    }
    cell += ch
    i++
  }
  // Trailing cell / row.
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0))
}

function indexHeaders(header: string[]): {
  email: number
  full_name: number
  phone: number
  vertical: number
} {
  const idx = { email: -1, full_name: -1, phone: -1, vertical: -1 }
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase().replace(/\s+/g, "_")
    if (key === "email") idx.email = i
    else if (key === "full_name" || key === "name" || key === "fullname")
      idx.full_name = i
    else if (key === "phone" || key === "mobile") idx.phone = i
    else if (key === "vertical" || key === "industry") idx.vertical = i
  })
  return idx
}

function validateRow(
  email: string,
  full_name: string,
  phone: string,
  vertical: string,
): ParsedRow {
  const emailClean = email.trim().toLowerCase()
  const nameClean = full_name.trim()
  const phoneClean = phone.trim()
  const verticalClean = vertical.trim()
  return {
    email: emailClean,
    full_name: nameClean,
    phone: phoneClean,
    vertical: verticalClean,
    email_ok: EMAIL_RE.test(emailClean),
    name_ok: nameClean.length >= 2,
    phone_ignored: phoneClean.length > 0 && !PHONE_RE.test(phoneClean),
    vertical_ignored:
      verticalClean.length > 0 && !VERTICAL_VALUES.has(verticalClean),
  }
}

export function AssessmentBulkInviteForm({ onIssued }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [sendEmails, setSendEmails] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<BulkInviteResult[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const summary = useMemo(() => {
    let valid = 0
    let invalid = 0
    let phoneIgnored = 0
    let verticalIgnored = 0
    for (const r of rows) {
      if (r.email_ok && r.name_ok) valid++
      else invalid++
      if (r.phone_ignored) phoneIgnored++
      if (r.vertical_ignored) verticalIgnored++
    }
    return { valid, invalid, phoneIgnored, verticalIgnored }
  }, [rows])

  const resultSummary = useMemo(() => {
    if (!results)
      return { created: 0, duplicates: 0, invalid: 0, errors: 0 }
    return results.reduce(
      (acc, r) => {
        if (r.status === "created") acc.created++
        else if (r.status === "duplicate") acc.duplicates++
        else if (r.status === "invalid") acc.invalid++
        else acc.errors++
        return acc
      },
      { created: 0, duplicates: 0, invalid: 0, errors: 0 },
    )
  }, [results])

  const handleFile = useCallback(async (incoming: File) => {
    setFile(incoming)
    setResults(null)
    setParseError(null)
    try {
      const text = await incoming.text()
      const cells = parseCsv(text)
      if (cells.length === 0) {
        setParseError("CSV appears to be empty")
        setRows([])
        return
      }
      const headerIdx = indexHeaders(cells[0])
      if (headerIdx.email === -1 || headerIdx.full_name === -1) {
        setParseError(
          "CSV must have header columns 'email' and 'full_name' (case-insensitive). Other recognised headers: phone, vertical.",
        )
        setRows([])
        return
      }
      const dataRows = cells.slice(1)
      if (dataRows.length === 0) {
        setParseError("No data rows found below the header")
        setRows([])
        return
      }
      if (dataRows.length > MAX_ROWS) {
        setParseError(
          `Too many rows (${dataRows.length}). Maximum ${MAX_ROWS} per upload.`,
        )
        setRows([])
        return
      }
      const parsed = dataRows.map((r) =>
        validateRow(
          r[headerIdx.email] ?? "",
          r[headerIdx.full_name] ?? "",
          headerIdx.phone === -1 ? "" : (r[headerIdx.phone] ?? ""),
          headerIdx.vertical === -1 ? "" : (r[headerIdx.vertical] ?? ""),
        ),
      )
      setRows(parsed)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Failed to parse CSV")
      setRows([])
    }
  }, [])

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (!dropped) return
    if (!/\.csv$/i.test(dropped.name)) {
      toast.error("Please drop a .csv file")
      return
    }
    void handleFile(dropped)
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    void handleFile(picked)
  }

  function reset() {
    setFile(null)
    setRows([])
    setResults(null)
    setParseError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSubmit() {
    const validRows = rows
      .filter((r) => r.email_ok && r.name_ok)
      .map((r) => ({
        email: r.email,
        full_name: r.full_name,
        phone: r.phone && !r.phone_ignored ? r.phone : undefined,
        vertical:
          r.vertical && !r.vertical_ignored ? r.vertical : undefined,
      }))

    if (validRows.length === 0) {
      toast.error("Nothing to upload — all rows are invalid")
      return
    }

    setSubmitting(true)
    try {
      const body: BulkInviteRequest = {
        rows: validRows,
        send_emails: sendEmails,
      }
      const res = await fetch("/api/admin/invites/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data: BulkInviteResponse = await res.json()
      if (!res.ok || data.ok === false) {
        const msg =
          data.ok === false ? data.error : "Bulk invite failed"
        throw new Error(msg)
      }
      setResults(data.results)
      toast.success(
        `${data.created} created · ${data.duplicates} dup · ${data.invalid} invalid · ${data.errors} failed`,
      )
      onIssued()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk invite failed")
    } finally {
      setSubmitting(false)
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      toast.success("Link copied")
    } catch {
      toast.error("Copy failed — select + copy from the field manually")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="size-5 text-primary" />
          Bulk Issue Invites (CSV)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!file && !results && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 text-center space-y-3"
          >
            <Upload className="size-8 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">Drop a CSV file here</p>
              <p className="text-sm text-muted-foreground mt-1">
                or
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onPick}
              className="hidden"
              id="bulk-invite-file"
            />
            <label htmlFor="bulk-invite-file" className="inline-block">
              <Button type="button" asChild variant="outline">
                <span>Choose file…</span>
              </Button>
            </label>
            <div className="pt-2 text-xs text-muted-foreground space-y-1">
              <p>
                Required columns:{" "}
                <code className="text-foreground">email</code>,{" "}
                <code className="text-foreground">full_name</code>
              </p>
              <p>
                Optional: <code>phone</code> (10-digit Indian mobile,
                starts 6–9), <code>vertical</code>
              </p>
              <p>Max {MAX_ROWS} rows per upload.</p>
            </div>
          </div>
        )}

        {file && !results && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">
                  {file.name}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={submitting}
              >
                <X className="size-4" />
              </Button>
            </div>

            {parseError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{parseError}</p>
              </div>
            )}

            {rows.length > 0 && (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-green-500 font-medium">
                    {summary.valid} valid
                  </span>
                  {summary.invalid > 0 && (
                    <span className="text-destructive font-medium">
                      {summary.invalid} invalid
                    </span>
                  )}
                  {summary.phoneIgnored > 0 && (
                    <span className="text-muted-foreground">
                      {summary.phoneIgnored} phone ignored
                    </span>
                  )}
                  {summary.verticalIgnored > 0 && (
                    <span className="text-muted-foreground">
                      {summary.verticalIgnored} vertical ignored
                    </span>
                  )}
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="max-h-[320px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">
                            #
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                            Email
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                            Name
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                            Phone
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">
                            Vertical
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 100).map((r, i) => {
                          const rowValid = r.email_ok && r.name_ok
                          return (
                            <tr
                              key={i}
                              className={`border-t border-border ${
                                rowValid ? "" : "bg-destructive/5"
                              }`}
                            >
                              <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                                {i + 1}
                              </td>
                              <td
                                className={`px-3 py-1.5 truncate max-w-[220px] ${
                                  r.email_ok ? "" : "text-destructive"
                                }`}
                              >
                                {r.email || (
                                  <span className="text-muted-foreground italic">
                                    empty
                                  </span>
                                )}
                              </td>
                              <td
                                className={`px-3 py-1.5 truncate max-w-[160px] ${
                                  r.name_ok ? "" : "text-destructive"
                                }`}
                              >
                                {r.full_name || (
                                  <span className="text-muted-foreground italic">
                                    empty
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 hidden sm:table-cell text-muted-foreground">
                                {r.phone || "—"}
                                {r.phone_ignored && (
                                  <span className="text-amber-500 ml-1 text-xs">
                                    (ignored)
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 hidden md:table-cell text-muted-foreground">
                                {r.vertical || "—"}
                                {r.vertical_ignored && (
                                  <span className="text-amber-500 ml-1 text-xs">
                                    (ignored)
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {rows.length > 100 && (
                      <p className="text-xs text-muted-foreground text-center py-2 border-t border-border bg-muted/20">
                        {rows.length - 100} more rows hidden in preview
                      </p>
                    )}
                  </div>
                </div>

                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmails}
                    onChange={(e) => setSendEmails(e.target.checked)}
                    className="mt-1 size-4 accent-primary"
                    disabled={submitting}
                  />
                  <div className="text-sm">
                    <p className="font-medium">
                      Send invite emails immediately
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {sendEmails
                        ? "Each founder gets the magic link in their inbox."
                        : "Invites are created silently — copy each link from the results."}
                    </p>
                  </div>
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={reset}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || summary.valid === 0}
                  >
                    {submitting && (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    )}
                    Issue {summary.valid} invite
                    {summary.valid === 1 ? "" : "s"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-green-500 font-medium">
                {resultSummary.created} created
              </span>
              {resultSummary.duplicates > 0 && (
                <span className="text-amber-500 font-medium">
                  {resultSummary.duplicates} duplicate
                </span>
              )}
              {resultSummary.invalid > 0 && (
                <span className="text-destructive font-medium">
                  {resultSummary.invalid} invalid
                </span>
              )}
              {resultSummary.errors > 0 && (
                <span className="text-destructive font-medium">
                  {resultSummary.errors} failed
                </span>
              )}
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8" />
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                        Email
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                        Outcome
                      </th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr
                        key={`${r.email}-${i}`}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2">
                          <StatusIcon status={r.status} />
                        </td>
                        <td className="px-3 py-2 truncate max-w-[220px]">
                          {r.email}
                        </td>
                        <td className="px-3 py-2 truncate max-w-[160px]">
                          {r.full_name}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.status === "created" ? (
                            r.email_sent ? (
                              "Created · emailed"
                            ) : (
                              <span className="text-amber-500">
                                Created · email failed
                              </span>
                            )
                          ) : (
                            r.reason || r.status
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.status === "created" && r.link && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLink(r.link!)}
                            >
                              <Copy className="size-3.5 mr-1" />
                              Copy link
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={reset}>
                Upload another
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusIcon({ status }: { status: BulkInviteResult["status"] }) {
  if (status === "created")
    return <CheckCircle2 className="size-4 text-green-500" />
  if (status === "duplicate")
    return <AlertCircle className="size-4 text-amber-500" />
  return <XCircle className="size-4 text-destructive" />
}
