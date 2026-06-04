"use client"

import { useState } from "react"
import { Play, X } from "lucide-react"

type VideoItem = {
  title: string
  description: string
  wistiaUrl: string
  coverImage?: string
}

const DEFAULT_COVER_IMAGE = "/images/rsb-cover.png"

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
            <div className="relative aspect-video bg-muted overflow-hidden">
              <img
  src={video.coverImage ?? DEFAULT_COVER_IMAGE}
  alt={video.title}
  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
/>

              <div className="absolute inset-0 bg-black/35 group-hover:bg-black/45 transition" />

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="rounded-full bg-primary text-primary-foreground p-4 shadow-lg transition group-hover:scale-105">
                  <Play className="size-6 fill-current" />
                </div>

                <p className="mt-3 text-sm font-semibold text-white">
                  {video.title}
                </p>
                <p className="mt-1 text-xs text-white/80">Click to watch</p>
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