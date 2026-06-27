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
    wistiaId: "yvznjrgha9",
  },
  {
    title: "Day 2 Video",
    description: "Rapid Scaling Bootcamp - Day 2",
    wistiaId: "oq3j7cr0bf",
  },
  {
    title: "Day 3 Video",
    description: "Rapid Scaling Bootcamp - Day 3",
    wistiaId: "eunb6hi8x9",
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Video className="size-3" />
            Recording
          </Badge>

          <Badge variant="outline">Breathwork</Badge>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{item.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="size-4" />
            {item.view_count} views
          </span>

          {item.video_duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="size-4" />
              {item.video_duration_minutes} min video
            </span>
          )}

          {item.read_time_minutes && (
            <span>{item.read_time_minutes} min read</span>
          )}
        </div>
      </div>

      {/* Video Card */}
      {videoId && (
        <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,560px)_1fr] lg:items-center">
              <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-sm">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&fs=1&iv_load_policy=3&disablekb=1&playsinline=1`}
                    title={item.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
                  Now Playing
                </p>

                <h2 className="text-xl font-semibold leading-tight">
                  {item.title}
                </h2>

                {item.one_line_takeaway && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.one_line_takeaway}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                    Session Video
                  </span>

                  <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                    Recordings
                  </span>

                  {item.video_duration_minutes && (
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                      {item.video_duration_minutes} min
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Takeaway */}
      {item.one_line_takeaway && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm font-medium leading-6">
              {item.one_line_takeaway}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Points */}
      {item.key_points && item.key_points.length > 0 && (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Key Points</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {item.key_points.map((kp, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/70 bg-background/40 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle className="size-4 shrink-0 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Point {i + 1}
                    </span>

                    {kp.timestamp && (
                      <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                        {kp.timestamp}
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-6 text-foreground/80">
                    {kp.point}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {item.action_items && item.action_items.length > 0 && (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Practice Actions</h2>

            <div className="space-y-3">
              {item.action_items.map((action, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-border/70 bg-background/40 p-4"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </div>

                  <p className="text-sm leading-6 text-foreground/80">
                    {action}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {item.full_summary && (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Summary</h2>

            <div className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {item.full_summary}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}