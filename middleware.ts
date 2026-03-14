import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that don't need auth
const publicRoutes = ["/", "/login", "/reset-password"]

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
          cookiesToSet.forEach(({ name, value, options }) =>
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

  // No user — redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Setup redirect — incomplete profile goes to /setup
  // Skip for: API routes, setup page itself, profile routes, members routes
  const skipSetupCheck =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/members")

  if (!skipSetupCheck && !pathname.startsWith("/admin")) {
    const { data: setupProfile } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("user_id", user.id)
      .single()

    if (setupProfile && !setupProfile.business_name) {
      const url = request.nextUrl.clone()
      url.pathname = "/setup"
      return NextResponse.redirect(url)
    }
  }

  // Admin routes — check admin role
  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // Skip subscription check for routes that don't require it
  const isNoSubRoute = noSubscriptionRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )

  if (!isNoSubRoute && !pathname.startsWith("/api/")) {
    // Check subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("expires_at")
      .eq("user_id", user.id)
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      const url = request.nextUrl.clone()
      url.pathname = "/renew"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
