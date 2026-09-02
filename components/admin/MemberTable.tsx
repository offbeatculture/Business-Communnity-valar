"use client"

import Link from "next/link"
import { useState, useCallback } from "react"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MemberActions } from "./MemberActions"
import { Search, Loader2 } from "lucide-react"
import type { ProfileWithSubscription } from "@/types"
import { INDUSTRIES } from "@/types"

type Props = {
  initialMembers: ProfileWithSubscription[]
  initialHasMore: boolean
}

export function MemberTable({ initialMembers, initialHasMore }: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [industry, setIndustry] = useState("all")
  const [status, setStatus] = useState("all")

  const fetchMembers = useCallback(async (params: {
    search?: string
    industry?: string
    status?: string
    page?: number
    append?: boolean
  }) => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      if (params.search) sp.set("search", params.search)
      if (params.industry && params.industry !== "all") sp.set("industry", params.industry)
      if (params.status && params.status !== "all") sp.set("status", params.status)
      sp.set("page", String(params.page ?? 1))

      const res = await fetch(`/api/admin/members?${sp.toString()}`)
      if (!res.ok) return

      const data = await res.json()

      if (params.append) {
        setMembers((prev) => [...prev, ...data.members])
      } else {
        setMembers(data.members)
      }
      setHasMore(data.hasMore)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
    fetchMembers({ search: value, industry, status, page: 1 })
  }

  function handleIndustryChange(value: string) {
    setIndustry(value)
    setPage(1)
    fetchMembers({ search, industry: value, status, page: 1 })
  }

  function handleStatusChange(value: string) {
    setStatus(value)
    setPage(1)
    fetchMembers({ search, industry, status: value, page: 1 })
  }

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchMembers({ search, industry, status, page: nextPage, append: true })
  }

  function handleRefresh() {
    setPage(1)
    fetchMembers({ search, industry, status, page: 1 })
  }

  const statusBadge = (s: ProfileWithSubscription["subscription_status"]) => {
    if (s === "active") return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
    if (s === "expired") return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Expired</Badge>
    return <Badge variant="outline" className="text-muted-foreground">None</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, business, or city..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={industry} onValueChange={handleIndustryChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRIES.map((ind) => (
              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={status} onValueChange={handleStatusChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-muted-foreground font-medium">Member</th>
              <th className="text-left py-2 text-muted-foreground font-medium hidden md:table-cell">Business</th>
              <th className="text-left py-2 text-muted-foreground font-medium hidden lg:table-cell">Industry</th>
              <th className="text-center py-2 text-muted-foreground font-medium">Status</th>
              <th className="text-left py-2 text-muted-foreground font-medium hidden md:table-cell">Joined</th>
              <th className="text-right py-2 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const initials = (member.full_name ?? "A")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()

              return (
                <tr key={member.id} className="border-b last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        {member.avatar_url ? (
                          <AvatarImage src={member.avatar_url} alt={member.full_name} />
                        ) : null}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="max-w-[150px] truncate font-medium hover:text-primary hover:underline"
                      >
                        {member.full_name}
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 hidden md:table-cell text-muted-foreground truncate max-w-[150px]">
                    {member.business_name || "—"}
                  </td>
                  <td className="py-3 hidden lg:table-cell">
                    {member.industry ? (
                      <Badge variant="outline" className="text-xs">{member.industry}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {statusBadge(member.subscription_status)}
                  </td>
                  <td className="py-3 hidden md:table-cell text-muted-foreground">
                    {format(new Date(member.created_at), "dd MMM yyyy")}
                  </td>
                  <td className="py-3 text-right">
                    <MemberActions
                      profileId={member.id}
                      memberName={member.full_name}
                      onActionComplete={handleRefresh}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {members.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm text-center py-8">
          No members found.
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
