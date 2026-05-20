import Link from "next/link"

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Mac trackpad two-finger scroll fix.
        globals.css sets `* { touch-action: manipulation }` globally, which
        breaks trackpad scroll on Chrome/macOS for our audit pages. Override
        on html/body specifically (the actual scroll containers).
        Scoped to this layout — when the user navigates away from /audit/*,
        this <style> element unmounts and the global behavior returns.
      */}
      <style>{`
        html, body {
          touch-action: auto !important;
          overscroll-behavior-y: auto !important;
        }
      `}</style>
      <div className="min-h-screen bg-background text-foreground">
        <header className="h-12 border-b border-border bg-card px-4 flex items-center">
          <Link href="/audit" className="text-sm font-semibold tracking-tight">
            <span className="text-primary">Business Audit</span>
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
