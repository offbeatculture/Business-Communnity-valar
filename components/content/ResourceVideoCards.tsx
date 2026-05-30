"use client"

import { useState } from "react"
import { Play, X } from "lucide-react"

type Video = {
  title: string
  description: string
  youtubeId: string
}

export function ResourceVideoCards({ videos }: { videos: Video[] }) {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Video Walkthroughs</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {videos.map((video) => (
          <button
            key={video.youtubeId}
            type="button"
            onClick={() => setActiveVideo(video)}
            className="group text-left rounded-xl border border-border/60 overflow-hidden bg-card hover:border-primary/40 transition"
          >
            <div className="relative aspect-video bg-muted">
              <img
                src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                alt={video.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />

              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                <div className="rounded-full bg-primary text-primary-foreground p-3">
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h3 className="font-semibold">{activeVideo.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {activeVideo.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="rounded-lg p-2 hover:bg-muted transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`}
                title={activeVideo.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}