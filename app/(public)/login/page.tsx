"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Leaf } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = "/dashboard"
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E8DDC8] p-4 text-[#4B3A25]">
      <Card className="w-full max-w-md border-[#C89B3C]/25 bg-[#F7F0E3] text-[#4B3A25] shadow-2xl shadow-black/10">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-[#C89B3C]/10">
                <Leaf className="h-6 w-6 text-[#8A6A22]" />
              </div>

              <div className="text-left">
                <span className="block text-xl font-bold leading-tight">
                  Daily Breathwork
                </span>
                <span className="text-xs text-[#6F7358]">
                  Valarmathi Community
                </span>
              </div>
            </div>
          </div>

          <CardTitle className="font-serif text-3xl font-semibold text-[#4B3A25]">
            Welcome back
          </CardTitle>

          <CardDescription className="font-medium text-[#6F7358]">
            Sign in to continue your daily breathwork practice.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[#4B3A25]"
              >
                Email
              </label>

              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[#C89B3C]/25 bg-[#FFF8EA] text-[#4B3A25] placeholder:text-[#6F7358]/60 focus-visible:ring-[#C89B3C]"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[#4B3A25]"
                >
                  Password
                </label>

                <Link
                  href="/reset-password"
                  className="text-xs font-medium text-[#8A6A22] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[#C89B3C]/25 bg-[#FFF8EA] text-[#4B3A25] placeholder:text-[#6F7358]/60 focus-visible:ring-[#C89B3C]"
                required
              />
            </div>

            {error && <p className="text-sm text-[#B42318]">{error}</p>}

            <Button
              type="submit"
              className="w-full rounded-full bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-[#6F7358]">
            Don&apos;t have an account?{" "}
            <Link href="/" className="text-[#8A6A22] hover:underline">
              Get Started
            </Link>
          </p>

          <p className="mt-2 text-center text-sm font-medium text-[#6F7358]">
            Paid but can&apos;t access your account?{" "}
            <Link
              href="/access-account"
              className="text-[#8A6A22] hover:underline"
            >
              Recover access
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}