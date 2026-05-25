import { sendEmail } from "@/lib/ses"

export type SendAssessmentInviteEmailInput = {
  to: string
  full_name: string
  magic_link: string
}

function firstName(fullName: string): string {
  const parts = (fullName ?? "").trim().split(/\s+/)
  return parts[0] && parts[0].length > 0 ? parts[0] : "there"
}

export async function sendAssessmentInviteEmail(
  input: SendAssessmentInviteEmailInput,
): Promise<void> {
  const { to, full_name, magic_link } = input
  const greeting = `Hi ${firstName(full_name)}`

  const subject = "Your Scale Code Diagnostic is ready"

  const text = `${greeting},

Your Scale Code Diagnostic is ready. It is a 15–20 minute deep-dive into where you actually are as a founder — and the single move that will pay back biggest from where you stand today.

Before you start:
- Have your monthly revenue ready (rough is fine)
- Have your monthly marketing spend ready
- Have your monthly cost of delivery / gross margin (best guess)
- Have the names of your top 3 customers in your head

Take it here:
${magic_link}

This is a one-time invite. Once you submit, I personally review your report before it goes out — within 24–48 hours.

— Swastik
Superhuman Entrepreneur`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #f5f5f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h2 style="color: #E53935; margin: 0 0 8px;">Superhuman Entrepreneur</h2>
    <p style="color: #9e9e9e; font-size: 14px; margin: 0 0 28px;">Your founder diagnostic</p>

    <p style="margin: 0 0 16px;">${greeting},</p>

    <p style="margin: 0 0 16px; line-height: 1.55;">
      Your Scale Code Diagnostic is ready. It is a 15–20 minute deep-dive into
      where you actually are as a founder — and the single move that will pay
      back biggest from where you stand today.
    </p>

    <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
      <p style="margin: 0 0 10px; font-weight: 600;">Before you start</p>
      <ul style="margin: 0; padding-left: 18px; color: #d4d4d4; font-size: 14px; line-height: 1.7;">
        <li>Your monthly revenue (rough is fine)</li>
        <li>Your monthly marketing spend</li>
        <li>Your monthly cost of delivery / gross margin (best guess)</li>
        <li>The names of your top 3 customers (just in your head)</li>
      </ul>
    </div>

    <div style="margin: 32px 0;">
      <a href="${magic_link}" style="background: #E53935; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Take the Diagnostic
      </a>
    </div>

    <p style="margin: 0 0 16px; color: #d4d4d4; font-size: 14px; line-height: 1.55;">
      This is a one-time invite. Once you submit, I personally review your
      report before it goes out — within 24–48 hours.
    </p>

    <p style="margin: 32px 0 0;">— Swastik<br/><span style="color: #9e9e9e; font-size: 13px;">Superhuman Entrepreneur</span></p>

    <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
    <p style="color: #555; font-size: 12px; margin: 0;">Superhuman Entrepreneur &mdash; Own Your Growth</p>
  </div>
</body>
</html>`

  await sendEmail({ to, subject, html, text })
}
