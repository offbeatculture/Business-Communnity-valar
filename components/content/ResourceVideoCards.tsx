"use client"

import { useState } from "react"
import { Play, X, Video } from "lucide-react"

type VideoItem = {
  title: string
  description: string
  wistiaUrl: string
}

export function ResourceVideoCards({ videos }: { videos: VideoItem[] }) {
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null)

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Video Walkthroughs</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {videos.map((video) => (
          <button
            key={video.wistiaUrl}
            type="button"
            onClick={() => setActiveVideo(video)}
            className="group text-left rounded-xl border border-border/60 overflow-hidden bg-card hover:border-primary/40 transition"
          >
            <div className="relative aspect-video bg-muted">
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background">
                <div className="rounded-full bg-primary/15 p-4 mb-3 group-hover:bg-primary/25 transition">
                  <Video className="size-7 text-primary" />
                </div>

                <p className="text-sm font-medium">{video.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click to watch
                </p>
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition">
                <div className="rounded-full bg-primary text-primary-foreground p-3 shadow-lg">
                  <Play className="size-5 fill-current" />
                </div>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-medium">{video.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {video.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-xl bg-background border border-border overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
              <div>
                <h3 className="font-semibold">{activeVideo.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {activeVideo.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="rounded-lg p-2 hover:bg-muted transition shrink-0"
                aria-label="Close video"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="aspect-video bg-black">
              <iframe
                src={activeVideo.wistiaUrl}
                title={activeVideo.title}
                className="h-full w-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}