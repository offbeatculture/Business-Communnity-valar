import { fetchRelatedContent } from "@/lib/content"
import { ContentCard } from "@/components/content/ContentCard"

type Props = {
  category: string
  excludeId: string
}

export async function RelatedContent({ category, excludeId }: Props) {
  const items = await fetchRelatedContent(category, excludeId)

  if (items.length === 0) return null

  return (
    <section className="text-[#4B3A25]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6A22]">
          Continue your practice
        </p>

        <h2 className="font-serif text-2xl font-semibold text-[#4B3A25]">
          Related Breathwork Resources
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}