import { revalidatePath } from "next/cache"
import { CalendarClock, LifeBuoy, Mail, Phone, Send } from "lucide-react"
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type CommunityIssue = {
  id: string
  ticket_id: string
  name: string
  email: string
  phone: string | null
  message: string
  screenshots: string[] | null
  status: string
  created_at: string
  admin_response: string | null
  response_sent_at: string | null
}

const statusOptions = ["open", "in progress", "resolved", "closed"]

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function getSesClient() {
  return new SESClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-south-1",
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  })
}

function getFromAddress() {
  const fromEmail = process.env.SES_FROM_EMAIL

  if (!fromEmail) {
    throw new Error("SES_FROM_EMAIL is missing")
  }

  const fromName = process.env.SES_FROM_NAME || "Valar Community Support"

  return `"${fromName}" <${fromEmail}>`
}

async function updateIssueStatus(formData: FormData) {
  "use server"

  const issueId = String(formData.get("issueId") || "")
  const status = String(formData.get("status") || "")

  if (!issueId || !statusOptions.includes(status)) {
    return
  }

  const supabase = createAdminClient()

  await supabase
    .from("community_issues")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", issueId)

  revalidatePath("/admin/community-issues")
}

async function sendManualResponseEmail(formData: FormData) {
  "use server"

  const issueId = String(formData.get("issueId") || "")
  const responseMessage = String(formData.get("responseMessage") || "").trim()

  if (!issueId || !responseMessage) {
    return
  }

  const supabase = createAdminClient()

  const { data: issue, error } = await supabase
    .from("community_issues")
    .select("id, ticket_id, name, email")
    .eq("id", issueId)
    .single()

  if (error || !issue) {
    console.error("Issue not found:", error)
    return
  }

  const subject = `Valar Community Support - ${issue.ticket_id}`

  const textBody = `Hi ${issue.name},

${responseMessage}

Ticket ID: ${issue.ticket_id}

Thank you,
Valar Community Support`

  const safeName = escapeHtml(issue.name)
  const safeTicketId = escapeHtml(issue.ticket_id)
  const safeMessage = escapeHtml(responseMessage).replaceAll("\n", "<br/>")

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background:#F7F0E3; padding:24px;">
      <div style="max-width:600px; margin:auto; background:#122015; color:#F7F0E3; border-radius:18px; padding:28px; border:1px solid rgba(200,155,60,0.35);">
        <h2 style="margin:0 0 16px; color:#D8B76A;">Valar Community Support</h2>

        <p>Hi ${safeName},</p>

        <p style="line-height:1.7;">${safeMessage}</p>

        <p>
          <strong>Ticket ID:</strong> ${safeTicketId}
        </p>

        <p style="margin-top:24px;">
          Thank you,<br/>
          Valar Community Support
        </p>
      </div>
    </div>
  `

  const ses = getSesClient()

  await ses.send(
    new SendEmailCommand({
      Source: getFromAddress(),
      Destination: {
        ToAddresses: [issue.email],
      },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: textBody,
          },
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
        },
      },
    })
  )

  await supabase
    .from("community_issues")
    .update({
      status: "resolved",
      admin_response: responseMessage,
      response_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", issueId)

  revalidatePath("/admin/community-issues")
}

function getStatusClass(status: string) {
  if (status === "resolved") {
    return "border-blue-500/40 bg-blue-500/10 text-blue-300"
  }

  if (status === "in progress") {
    return "border-red-500/40 bg-red-500/10 text-red-300"
  }

  if (status === "closed") {
    return "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
  }

  return "border-[#D8B76A]/40 bg-[#D8B76A]/10 text-[#F1D58A]"
}

export default async function CommunityIssuesPage() {
  const supabase = createAdminClient()

  const { data: issues, error } = await supabase
    .from("community_issues")
    .select("*")
    .order("created_at", { ascending: false })

  const rows = (issues || []) as CommunityIssue[]

  return (
    <main className="min-h-screen bg-[#0E2A17] px-6 py-8 text-[#F7F0E3]">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/25 bg-[#122015] px-4 py-2 text-sm font-semibold text-[#D8B76A]">
          <LifeBuoy className="h-4 w-4" />
          Daily Breathwork Support
        </div>

        <h1 className="text-3xl font-bold">Community Issues</h1>

        <p className="mt-2 text-sm text-[#E8DDC8]/70">
          Support requests submitted from the public login support page.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Failed to load community issues.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[#C89B3C]/20 bg-[#122015] p-8 text-center">
          <LifeBuoy className="mx-auto mb-4 h-10 w-10 text-[#D8B76A]" />

          <h2 className="text-lg font-semibold">No community issues yet</h2>

          <p className="mt-2 text-sm text-[#E8DDC8]/65">
            When users submit issues from the login page, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((issue) => (
            <div
              key={issue.id}
              className="rounded-2xl border border-[#C89B3C]/20 bg-[#122015] p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[#F7F0E3]">
                      {issue.ticket_id}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                        issue.status
                      )}`}
                    >
                      {issue.status}
                    </span>

                    <span className="flex items-center gap-1 text-xs text-[#E8DDC8]/60">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatDate(issue.created_at)}
                    </span>

                    {issue.response_sent_at && (
                      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-200">
                        Email sent
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-xl font-semibold">{issue.name}</h2>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#E8DDC8]/75">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#D8B76A]" />
                      {issue.email}
                    </span>

                    {issue.phone && (
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[#D8B76A]" />
                        {issue.phone}
                      </span>
                    )}
                  </div>
                </div>

                <form action={updateIssueStatus} className="flex gap-2">
                  <input type="hidden" name="issueId" value={issue.id} />

                  <select
                    name="status"
                    defaultValue={issue.status}
                    className="rounded-xl border border-[#C89B3C]/20 bg-[#171713] px-3 py-2 text-sm text-[#F7F0E3] outline-none"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#D8B76A] px-4 py-2 text-sm font-semibold text-[#122015]"
                  >
                    Update
                  </button>
                </form>
              </div>

              <div className="mt-5 rounded-xl border border-[#C89B3C]/15 bg-[#0E2A17] p-4 text-sm leading-7 text-[#F7F0E3]">
                {issue.message}
              </div>

              {issue.screenshots && issue.screenshots.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {issue.screenshots.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-xl border border-[#C89B3C]/20"
                    >
                      <img
                        src={url}
                        alt="Issue screenshot"
                        className="h-40 w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}

              <form
                action={sendManualResponseEmail}
                className="mt-5 rounded-2xl border border-[#C89B3C]/15 bg-[#0E2A17] p-4"
              >
                <input type="hidden" name="issueId" value={issue.id} />

                <label className="mb-2 block text-sm font-semibold text-[#D8B76A]">
                  Write email response
                </label>

                <textarea
                  name="responseMessage"
                  defaultValue={issue.admin_response || ""}
                  placeholder="Example: Hi, your login issue has been fixed. Please try logging in again now."
                  required
                  rows={4}
                  className="w-full rounded-xl border border-[#C89B3C]/20 bg-[#122015] px-4 py-3 text-sm text-[#F7F0E3] outline-none placeholder:text-[#E8DDC8]/45 focus:border-[#D8B76A]"
                />

                <button
                  type="submit"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#D8B76A] px-4 py-2 text-sm font-bold text-[#122015] hover:bg-[#C89B3C]"
                >
                  <Send className="h-4 w-4" />
                  Send email and mark resolved
                </button>

                {issue.response_sent_at && (
                  <p className="mt-2 text-xs text-green-200">
                    Last email sent on {formatDate(issue.response_sent_at)}
                  </p>
                )}
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}