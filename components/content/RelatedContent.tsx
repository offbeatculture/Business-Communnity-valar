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
    <section>
      <h2 className="text-lg font-semibold mb-4">Related Content</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
