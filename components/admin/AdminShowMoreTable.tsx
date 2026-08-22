"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export type AdminTableRow = {
  id: string
  name: string
  email: string
  phone: string
  status: string
  recurringStatus: string
  expiresAt: string
}

type AdminShowMoreTableProps = {
  rows: AdminTableRow[]
  emptyText: string
  initialLimit?: number
}


export function AdminShowMoreTable({
  rows,
  emptyText,
  initialLimit = 8,
}: AdminShowMoreTableProps) {
  const [visibleCount, setVisibleCount] = useState(initialLimit)

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  const visibleRows = rows.slice(0, visibleCount)
  const hasMore = visibleCount < rows.length
  const isExpanded = visibleCount > initialLimit
  const remainingCount = rows.length - visibleCount

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Recurring</th>
              <th className="px-4 py-3">Expires</th>
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-semibold">{row.name}</p>
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {row.email}
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {row.phone}
                </td>

                <td className="px-4 py-3">
                  <StatusPill value={row.status} />
                </td>

                <td className="px-4 py-3">
                  <StatusPill value={row.recurringStatus} />
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {row.expiresAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(hasMore || isExpanded) && (
        <div className="flex flex-wrap justify-center gap-3">
          {hasMore && (
            <Button
              variant="outline"
              onClick={() =>
                setVisibleCount((current) =>
                  Math.min(current + initialLimit, rows.length)
                )
              }
            >
              Show more ({remainingCount})
            </Button>
          )}

          {isExpanded && (
            <Button
              variant="outline"
              onClick={() => setVisibleCount(initialLimit)}
            >
              Show less
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase()
  const isActive = normalized === "active"

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? "bg-green-100 text-green-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {value}
    </span>
  )
}