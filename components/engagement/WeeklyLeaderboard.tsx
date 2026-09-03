import { Trophy } from "lucide-react"
import { formatWeekRange, type LeaderboardRow, type WeekWindow } from "@/lib/checkin"

type Props = {
  rows: LeaderboardRow[]
  window: WeekWindow
  currentUser: LeaderboardRow | null
}

export function WeeklyLeaderboard({ rows, window: win, currentUser }: Props) {
  const showOwnRow =
    currentUser && !rows.some((r) => r.userId === currentUser.userId)

  return (
    <div className="rounded-3xl border border-[#C89B3C]/30 bg-[#F7F0E3] p-5 text-[#4B3A25] sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8A6A22]">
            {win.label}
          </p>
          <h2 className="mt-1 font-serif text-xl font-semibold">
            Practice leaderboard
          </h2>
        </div>
        <span className="text-xs font-medium text-[#6F7358]">
          {formatWeekRange(win)}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#C89B3C]/30 bg-white/40 px-4 py-8 text-center">
          <Trophy className="mb-2 size-6 text-[#C89B3C]" />
          <p className="text-sm font-medium text-[#6F7358]">
            The week is just beginning. Log a check-in to get on the board.
          </p>
        </div>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row) => (
            <Row key={row.userId} row={row} />
          ))}

          {showOwnRow && (
            <>
              <li className="py-1 text-center text-xs font-medium text-[#6F7358]">
                ···
              </li>
              <Row row={currentUser} />
            </>
          )}
        </ol>
      )}

      <p className="mt-4 text-center text-xs font-medium leading-5 text-[#6F7358]">
        Standings reset every Monday. The Sunday call celebrates the week just
        finished.
      </p>
    </div>
  )
}

function Row({ row }: { row: LeaderboardRow }) {
  const isTopThree = row.rank <= 3

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        row.isCurrentUser
          ? "border-[#C89B3C]/50 bg-[#C89B3C]/12"
          : "border-transparent bg-white/50"
      }`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
          isTopThree
            ? "bg-[#C89B3C] text-white"
            : "bg-[#C89B3C]/15 text-[#8A6A22]"
        }`}
      >
        {row.rank}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {row.name}
        {row.isCurrentUser && (
          <span className="ml-1.5 text-xs font-medium text-[#8A6A22]">you</span>
        )}
      </span>

      <span className="shrink-0 text-sm font-bold tabular-nums text-[#8A6A22]">
        {row.points}
      </span>
    </li>
  )
}
