import { PromptCard } from "./PromptCard"
import type { PromptLibraryItem } from "@/types"

type Props = {
  prompts: PromptLibraryItem[]
}

export function PromptGrid({ prompts }: Props) {
  if (prompts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">No prompts found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  )
}
