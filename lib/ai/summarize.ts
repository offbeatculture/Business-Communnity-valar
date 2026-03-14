import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod/v4"

const client = new Anthropic()

const SummarySchema = z.object({
  title: z.string(),
  one_line_takeaway: z.string(),
  key_points: z.array(
    z.object({
      point: z.string(),
      timestamp: z.string().optional(),
    })
  ),
  action_items: z.array(z.string()),
  full_summary: z.string(),
  read_time_minutes: z.number(),
  video_duration_minutes: z.number().optional(),
})

export type AISummary = z.infer<typeof SummarySchema>

const SYSTEM_PROMPT = `You are a business content summarizer for an entrepreneur community.
Given a YouTube video transcript, create a structured summary optimized for busy business owners.

Return a JSON object with exactly these fields:
- title: A clear, actionable title for the summary (not the original video title)
- one_line_takeaway: The single most important insight in one sentence
- key_points: Array of { point: string, timestamp?: string } — 5-8 key insights
- action_items: Array of 3-5 specific, actionable next steps the viewer can take
- full_summary: A 2-3 paragraph summary covering the main ideas
- read_time_minutes: Estimated reading time for the summary (usually 2-5)
- video_duration_minutes: Estimated video length from transcript length (optional)

Focus on practical business value. Be specific, not generic.
Return ONLY valid JSON, no markdown fences or extra text.`

export async function generateVideoSummary(
  transcript: string,
  youtubeUrl: string
): Promise<AISummary> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Summarize this YouTube video transcript.\n\nVideo URL: ${youtubeUrl}\n\nTranscript:\n${transcript.slice(0, 15000)}`,
      },
    ],
    system: SYSTEM_PROMPT,
  })

  const text =
    response.content[0].type === "text" ? response.content[0].text : ""

  // Parse and validate
  const parsed = JSON.parse(text)
  const result = SummarySchema.parse(parsed)

  return result
}
