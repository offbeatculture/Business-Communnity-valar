/** Loading placeholder matching the PlaylistPlayer's two-column layout. */
export function PlayerSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <div className="aspect-video animate-pulse rounded-2xl bg-[#E8DDC8]" />
        <div className="h-40 animate-pulse rounded-2xl bg-[#F7F0E3]" />
      </div>

      <div className="h-[28rem] animate-pulse rounded-2xl bg-[#F7F0E3]" />
    </div>
  )
}
