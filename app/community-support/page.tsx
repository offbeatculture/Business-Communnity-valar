"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ImagePlus, LifeBuoy, Loader2, X } from "lucide-react"

const MAX_FILES = 3
const MAX_TOTAL_SIZE = 3 * 1024 * 1024

export default function CommunitySupportPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [successTicket, setSuccessTicket] = useState("")
  const [error, setError] = useState("")

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || [])
    const nextFiles = [...screenshots, ...selectedFiles].slice(0, MAX_FILES)

    const totalSize = nextFiles.reduce((total, file) => total + file.size, 0)

    if (totalSize > MAX_TOTAL_SIZE) {
      setError("Screenshots must be less than 3 MB total")
      event.target.value = ""
      return
    }

    setError("")
    setScreenshots(nextFiles)
    event.target.value = ""
  }

  function removeScreenshot(index: number) {
    setScreenshots((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setError("")
    setSuccessTicket("")

    try {
      const formData = new FormData()

      formData.append("name", name)
      formData.append("email", email)
      formData.append("phone", phone)
      formData.append("message", message)

      screenshots.forEach((file) => {
        formData.append("screenshots", file)
      })

      const response = await fetch("/api/community-issues", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }

      setSuccessTicket(data.issue?.ticket_id || "Submitted")
      setName("")
      setEmail("")
      setPhone("")
      setMessage("")
      setScreenshots([])
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-[#F7F0E3] px-4 py-4 text-[#122015]">
      <div className="mx-auto flex w-full max-w-xl flex-col justify-center">
        <Link
          href="/login"
          className="mb-3 inline-flex w-fit items-center gap-2 text-sm font-medium text-[#8A6A22] hover:text-[#122015]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="rounded-3xl border border-[#C89B3C]/30 bg-[#122015] p-5 text-[#F7F0E3] shadow-xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#C89B3C]/15">
              <LifeBuoy className="h-5 w-5 text-[#D8B76A]" />
            </div>

            <div>
              <h1 className="text-xl font-bold">Community Support</h1>
              <p className="text-xs text-[#E8DDC8]/65">
                Daily Breathwork · Valarmathi Community
              </p>
            </div>
          </div>

          <p className="mb-3 text-sm leading-5 text-[#E8DDC8]/75">
            Trouble logging in or something not working? Tell us what happened
            and we’ll help. You don’t need to be logged in.
          </p>

          {successTicket && (
            <div className="mb-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
              Your issue has been submitted successfully.
              <br />
              Ticket ID: <strong>{successTicket}</strong>
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                  className="h-10 w-full rounded-xl border border-[#C89B3C]/20 bg-[#0E2A17] px-4 text-sm text-[#F7F0E3] outline-none placeholder:text-[#E8DDC8]/45 focus:border-[#D8B76A]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Email</label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="h-10 w-full rounded-xl border border-[#C89B3C]/20 bg-[#0E2A17] px-4 text-sm text-[#F7F0E3] outline-none placeholder:text-[#E8DDC8]/45 focus:border-[#D8B76A]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Phone <span className="text-[#E8DDC8]/55">(optional)</span>
              </label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+91..."
                className="h-10 w-full rounded-xl border border-[#C89B3C]/20 bg-[#0E2A17] px-4 text-sm text-[#F7F0E3] outline-none placeholder:text-[#E8DDC8]/45 focus:border-[#D8B76A]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Describe your issue
              </label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell us what’s happening — what you tried, what you saw..."
                required
                rows={3}
                className="w-full resize-none rounded-xl border border-[#C89B3C]/20 bg-[#0E2A17] px-4 py-3 text-sm text-[#F7F0E3] outline-none placeholder:text-[#E8DDC8]/45 focus:border-[#D8B76A]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Screenshots{" "}
                <span className="text-[#E8DDC8]/55">
                  optional — up to 3 images, 3 MB total
                </span>
              </label>

              <div className="flex flex-wrap gap-3">
                {screenshots.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#C89B3C]/20 bg-[#0E2A17]"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Screenshot preview"
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => removeScreenshot(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {screenshots.length < MAX_FILES && (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#C89B3C]/35 bg-[#0E2A17] text-[#E8DDC8]/70 hover:border-[#D8B76A] hover:text-[#F7F0E3]">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="text-center text-xs">
                      <ImagePlus className="mx-auto mb-1 h-5 w-5" />
                      Add
                    </div>
                  </label>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#D8B76A] px-5 text-sm font-bold text-[#122015] transition hover:bg-[#C89B3C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Submitting..." : "Submit issue"}
            </button>
          </form>

          <p className="mt-3 text-center text-xs text-[#E8DDC8]/55">
            Our team will contact you through the email shared above.
          </p>
        </div>
      </div>
    </main>
  )
}