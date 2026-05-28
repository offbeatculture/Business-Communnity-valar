import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that don't need auth
const publicRoutes = ["/", "/login", "/reset-password", "/plans", "/payment-success", "/set-password" , "/access-account", "/1499" , "/plans/1499",]

// Routes that authenticated users can access even without active subscription
const noSubscriptionRoutes = ["/subscription", "/profile", "/setup", "/renew"]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use supabase.auth.getSession() in middleware
  // Use getUser() instead for security
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes — pass through
  if (publicRoutes.some((route) => pathname === route) || pathname.startsWith("/auth/")) {
    // If user is already logged in and visiting login page, redirect to dashboard
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // API webhook routes — pass through (verified by their own signature check)
  if (pathname.startsWith("/api/webhooks")) {
    return supabaseResponse
  }

  // Onboarding API routes — pass through (no auth required)
  if (pathname.startsWith("/api/onboarding") || pathname.startsWith("/api/auth/magic-link")) {
    return supabaseResponse
  }

  // 7 Forces Business Audit — public funnel entry, no auth required
  if (pathname === "/audit" || pathname.startsWith("/audit/") || pathname.startsWith("/api/audit/")) {
    return supabaseResponse
  }

  // Long-form Assessment — invite-token IS the auth, no login required.
  // Founders open the magic link; /api/invites/[token]/resolve gates access.
  if (
    pathname === "/assess" ||
    pathname.startsWith("/assess/") ||
    pathname.startsWith("/api/invites/") ||
    pathname.startsWith("/api/diagnostic/")
  ) {
    return supabaseResponse
  }

  // No user — redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Combined profile query (one DB call for password_set + business_name + role)
  const skipProfileCheck =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/set-password")

  if (!skipProfileCheck) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, password_set, role")
      .eq("user_id", user.id)
      .single()

    // Password not yet set — redirect to /set-password
    // Strict check: only false triggers redirect (NULL and true pass through)
    if (profile && profile.password_set === false && !pathname.startsWith("/set-password")) {
      const url = request.nextUrl.clone()
      url.pathname = "/set-password"
      return NextResponse.redirect(url)
    }

    // Admin routes — check admin role
    if (pathname.startsWith("/admin")) {
      if (profile?.role !== "admin") {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Setup redirect — incomplete profile goes to /setup
    const skipSetupCheck =
      pathname.startsWith("/setup") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/members")

    if (!skipSetupCheck && profile && !profile.business_name) {
      const url = request.nextUrl.clone()
      url.pathname = "/setup"
      return NextResponse.redirect(url)
    }
  }

  // Skip subscription check for routes that don't require it
  const isNoSubRoute = noSubscriptionRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )

  if (!isNoSubRoute && !pathname.startsWith("/api/")) {
    // Check subscription — include recurring_status filter
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("expires_at, recurring_status")
      .eq("user_id", user.id)
      .gte("expires_at", new Date().toISOString())
      .or("recurring_status.is.null,recurring_status.in.(active,paused)")
      .order("expires_at", { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      const url = request.nextUrl.clone()
      url.pathname = "/renew"
      return NextResponse.redirect(url)
    }

    // TODO(phase-3): surface tier/tier_rank from subscription into request
    // context (e.g. response headers consumed by server components). Edge
    // runtime is fiddly here — Supabase server client + cookie writes are
    // already in flight, and downstream code should call `getUserTier()`
    // from `lib/auth/tier.ts` for authoritative checks anyway. Revisit if
    // header-based hints become a measurable win.
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
