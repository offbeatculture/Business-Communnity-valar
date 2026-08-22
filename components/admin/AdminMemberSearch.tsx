"use client"

import { useMemo, useState } from "react"
import { CalendarClock, Search, X } from "lucide-react"
import type { AdminTableRow } from "@/components/admin/AdminShowMoreTable"

type AdminMemberSearchProps = {
  rows: AdminTableRow[]
}

export function AdminMemberSearch({ rows }: AdminMemberSearchProps) {
  const [query, setQuery] = useState("")

  const searchText = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (searchText.length < 2) return []

    return rows
      .filter((row) => {
        const searchableValue = `
          ${row.name}
          ${row.email}
          ${row.phone}
          ${row.status}
          ${row.recurringStatus}
          ${row.expiresAt}
        `.toLowerCase()

        return searchableValue.includes(searchText)
      })
      .slice(0, 10)
  }, [rows, searchText])

  const showResults = searchText.length >= 2

  return (
    <div className="relative w-full sm:w-[420px]">
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search member by name, email or phone..."
        className="h-11 w-full rounded-full border border-border/70 bg-background/40 pl-11 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />

      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
        >
          <X className="size-4" />
        </button>
      )}

      {showResults && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-full overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Search Results
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {results.length > 0
                ? `${results.length} matching member found`
                : "No matching member found"}
            </p>
          </div>

          {results.length > 0 ? (
            <div className="max-h-[360px] overflow-auto">
              {results.map((row) => (
                <div
                  key={row.id}
                  className="border-b border-border/50 px-4 py-3 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {row.name}
                      </p>

                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {row.email}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.phone}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.status.toLowerCase() === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Recurring: {row.recurringStatus}</span>

                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="size-3.5" />
                      Expires: {row.expiresAt}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No member found with this name, email or phone.
            </div>
          )}
        </div>
      )}
    </div>
  )
}