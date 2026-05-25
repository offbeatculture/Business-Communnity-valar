import Link from "next/link"
import type { ReactNode } from "react"

// ════════════════════════════════════════════════════════════
// AssessmentShell — visual chrome for /assess/[token]/* pages
// ════════════════════════════════════════════════════════════
// Mirrors the audit layout (header / centred max-w-2xl content
// / footer) so the invite-only flow feels native to the same
// product, but without the "Business Audit" wordmark — this is
// the Scale Code Diagnostic instead. Server-friendly: no client
// hooks here.

export function AssessmentShell({ children }: { children: ReactNode }) {
  return (
    <>
      {/*
        Mac trackpad two-finger scroll fix — same as audit layout.
        globals.css sets `* { touch-action: manipulation }` which
        breaks trackpad scroll on Chromium/macOS. Scoped override.
      */}
      <style>{`
        html, body {
          touch-action: auto !important;
          overscroll-behavior-y: auto !important;
        }
      `}</style>
      <div className="min-h-screen bg-background text-foreground">
        <header className="h-12 border-b border-border bg-card px-4 flex items-center">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            <span className="text-primary">Scale Code Diagnostic</span>
            <span className="text-muted-foreground"> · Swastik Nandakumar</span>
          </Link>
        </header>
        <main>
          <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">{children}</div>
        </main>
        <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
          © Offbeat Culture · The 7 Forces methodology
        </footer>
      </div>
    </>
  )
}
