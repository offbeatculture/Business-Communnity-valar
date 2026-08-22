"use client"

import { useState } from "react"
import { Search, ShieldCheck, KeyRound, Loader2, Copy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type UserResult = {
  id: string
  email: string
  name: string
  phone: string
}

export function TempPasswordClient() {
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<UserResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [password, setPassword] = useState("")
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function generatePassword() {
    const random = Math.random().toString(36).slice(-6)
    const tempPassword = `Valar@${random}`
    setPassword(tempPassword)
  }

  async function copyPassword() {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setMessage("Password copied.")
  }

  async function searchUsers() {
    setMessage("")
    setError("")
    setSelectedUser(null)

    if (!query.trim()) {
      setError("Please enter name, email, or phone.")
      return
    }

    setSearching(true)

    try {
      const res = await fetch(
        `/api/admin/temp-password/search?q=${encodeURIComponent(query.trim())}`
      )

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to search users.")
        return
      }

      setUsers(data.users || [])

      if (!data.users || data.users.length === 0) {
        setMessage("No users found.")
      }
    } catch {
      setError("Something went wrong while searching.")
    } finally {
      setSearching(false)
    }
  }

  async function setTempPassword() {
    setMessage("")
    setError("")

    if (!selectedUser) {
      setError("Please select a user first.")
      return
    }

    if (!password.trim() || password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setSaving(true)

    try {
      const res = await fetch("/api/admin/temp-password/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to set temporary password.")
        return
      }

      setMessage(`Temporary password set for ${selectedUser.email}.`)
    } catch {
      setError("Something went wrong while setting password.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
              <KeyRound className="size-5 text-primary" />
            </div>

            <div>
              <CardTitle>Set Temporary Password</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Search a member and set a temporary password for login support.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchUsers()
                }}
                placeholder="Search by email, name, or phone"
                className="h-11 w-full rounded-xl border border-border bg-background px-10 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>

            <Button
              type="button"
              onClick={searchUsers}
              disabled={searching}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {searching ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Searching
                </>
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {users.length > 0 && (
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="border-b border-border bg-muted/50 px-4 py-3 text-sm font-semibold">
                Search results
              </div>

              <div className="divide-y divide-border">
                {users.map((user) => {
                  const isSelected = selectedUser?.id === user.id

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                        isSelected ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {user.name || "No name"}
                        </p>

                        {isSelected && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                            Selected
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {user.phone || "No phone"}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldCheck className="size-5 text-primary" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Selected user</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedUser.name || "No name"} · {selectedUser.email}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter temporary password"
                      className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={generatePassword}
                    >
                      Generate
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyPassword}
                      disabled={!password}
                    >
                      <Copy className="mr-2 size-4" />
                      Copy
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={setTempPassword}
                    disabled={saving}
                    className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Setting password
                      </>
                    ) : (
                      "Set temporary password"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}