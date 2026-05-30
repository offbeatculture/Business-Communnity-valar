import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { fetchContentById } from "@/lib/content"
import { fetchPromptsByContentId } from "@/lib/prompts"
import { RelatedContent } from "@/components/content/RelatedContent"
import { PromptCard } from "@/components/prompts/PromptCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ResourceVideoCards } from "@/components/content/ResourceVideoCards"
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Eye,
  Clock,
  FileText,
  Video,
  FileSpreadsheet,
  CheckCircle,
  Lightbulb,
} from "lucide-react"
import { ViewTracker } from "./ViewTracker"
import { DocumentTabs } from "@/components/content/DocumentTabs"

type Props = {
  params: Promise<{ id: string }>
}

const RSB_VIDEOS = [
  {
    title: "Day 1 Video",
    description: "Rapid Scaling Bootcamp - Day 1",
    youtubeId: "uCO6VorqBc0",
  },
  {
    title: "Day 2 Video",
    description: "Rapid Scaling Bootcamp - Day 2",
    youtubeId: "4JzbeWkGWlo",
  },
  {
    title: "Day 3 Video",
    description: "Rapid Scaling Bootcamp - Day 3",
    youtubeId: "oGn8jKfIF6U",
  },
]

async function getUserPlan() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return "1299"
  }

  const { data: premiumSubscription, error } = await supabase
    .from("subscriptions")
    .select("id, amount_paid")
    .eq("user_id", user.id)
    .eq("amount_paid", 149900)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Subscription check error:", error)
    return "1299"
  }

  return premiumSubscription ? "1499" : "1299"
}

export default async function ContentDetailPage({ params }: Props) {
  const { id } = await params

  const [item, relatedPrompts, userPlan] = await Promise.all([
    fetchContentById(id),
    fetchPromptsByContentId(id),
    getUserPlan(),
  ])

  if (!item) notFound()

  return (
    <div>
      <ViewTracker id={id} />

      <Link
        href="/content"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        Back to Library
      </Link>

      {item.content_type === "resource" ? (
        <ResourceDetail item={item} userPlan={userPlan} />
      ) : (
        <VideoSummaryDetail item={item} />
      )}

      {relatedPrompts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Related Prompts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedPrompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <RelatedContent category={item.category} excludeId={item.id} />
      </div>
    </div>
  )
}

function ResourceDetail({
  item,
  userPlan,
}: {
  item: Extract<
    Awaited<ReturnType<typeof fetchContentById>>,
    { content_type: "resource" }
  >
  userPlan: string
}) {
  const Icon = item.type === "cheat_sheet" ? FileText : FileSpreadsheet
  const typeLabel = item.type === "cheat_sheet" ? "Cheat Sheet" : "Template"
  const isHtml = item.file_url?.endsWith(".html") ?? false
  const documents = item.documents ?? []
  const hasDocuments = documents.length > 0

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Badge
          variant="secondary"
          className={
            item.type === "cheat_sheet"
              ? "bg-blue-500/10 text-blue-500"
              : "bg-green-500/10 text-green-500"
          }
        >
          <Icon className="size-3" />
          {typeLabel}
        </Badge>
        <Badge variant="outline">{item.category}</Badge>
      </div>

      <h1 className="text-2xl font-bold mb-2">{item.title}</h1>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-6">
        <span className="flex items-center gap-1">
          <Eye className="size-4" />
          {item.view_count} views
        </span>
        <span>
          {new Date(item.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {item.description && (
        <p className="text-muted-foreground mb-6">{item.description}</p>
      )}

    {hasDocuments ? (
  <>
    <DocumentTabs
      resourceId={item.id}
      documents={documents}
      userPlan={userPlan}
    />

    {item.title === "Rapid Scaling Bootcamp" && (
      <ResourceVideoCards videos={RSB_VIDEOS} />
    )}
  </>
) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {item.file_url && (
              <a
                href={`/api/content/${item.id}/download`}
                className="w-full sm:w-auto"
              >
                <Button className="w-full sm:w-auto">
                  <Download className="size-4 mr-2" />
                  {isHtml ? "Download HTML" : "Download PDF"}
                </Button>
              </a>
            )}

            {item.external_url && (
              <a
                href={item.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button variant="outline" className="w-full sm:w-auto">
                  <ExternalLink className="size-4 mr-2" />
                  Open Link
                </Button>
              </a>
            )}
          </div>

          {isHtml && (
            <iframe
              src={`/api/content/${item.id}/render`}
              sandbox="allow-scripts allow-same-origin"
              className="w-full rounded-lg border min-h-[50vh] sm:min-h-[70vh]"
              title={item.title}
            />
          )}
        </>
      )}
    </div>
  )
}

function VideoSummaryDetail({
  item,
}: {
  item: Extract<
    Awaited<ReturnType<typeof fetchContentById>>,
    { content_type: "video_summary" }
  >
}) {
  const videoId = item.youtube_video_id

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
          <Video className="size-3" />
          Video Summary
        </Badge>
        <Badge variant="outline">{item.category}</Badge>
      </div>

      <h1 className="text-2xl font-bold mb-2">{item.title}</h1>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-6">
        <span className="flex items-center gap-1">
          <Eye className="size-4" />
          {item.view_count} views
        </span>

        {item.read_time_minutes && (
          <span className="flex items-center gap-1">
            <Clock className="size-4" />
            {item.read_time_minutes} min read
          </span>
        )}

        {item.video_duration_minutes && (
          <span>{item.video_duration_minutes} min video</span>
        )}
      </div>

      {videoId && (
        <div className="aspect-video rounded-lg overflow-hidden mb-6">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={item.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {item.one_line_takeaway && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 pt-0">
            <Lightbulb className="size-5 text-primary mt-0.5 shrink-0" />
            <p className="font-medium">{item.one_line_takeaway}</p>
          </CardContent>
        </Card>
      )}

      {item.key_points && item.key_points.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Key Points</h2>
          <ul className="space-y-2">
            {item.key_points.map((kp, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm">
                  {kp.point}
                  {kp.timestamp && (
                    <span className="text-muted-foreground ml-1">
                      ({kp.timestamp})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.action_items && item.action_items.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Action Items</h2>
          <ol className="space-y-2 list-decimal list-inside">
            {item.action_items.map((action, i) => (
              <li key={i} className="text-sm">
                {action}
              </li>
            ))}
          </ol>
        </div>
      )}

      {item.full_summary && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Full Summary</h2>
          <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {item.full_summary}
          </div>
        </div>
      )}

      <a href={item.youtube_url} target="_blank" rel="noopener noreferrer">
        <Button variant="outline">
          <ExternalLink className="size-4 mr-2" />
          Watch on YouTube
        </Button>
      </a>
    </div>
  )
}