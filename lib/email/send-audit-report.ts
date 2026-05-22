import { sendEmailWithAttachment } from "@/lib/ses"

export type SendAuditReportEmailInput = {
  to: string
  name: string
  businessName: string
  pdfBuffer: Buffer
}

function sanitizeBusinessNameForFilename(businessName: string): string {
  const sanitized = businessName
    .replace(/[^A-Za-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  return sanitized.length > 0
    ? `${sanitized}-business-audit-report.pdf`
    : "business-audit-report.pdf"
}

export async function sendAuditReportEmail(
  input: SendAuditReportEmailInput,
): Promise<void> {
  const { to, name, businessName, pdfBuffer } = input

  const subject = "Your Business Audit Report is Ready"

  const text = `Hi ${name},

Thank you for completing the Business Audit.

Your personalized audit report is attached as a PDF. It highlights your current growth bottleneck, your priority force, and the next move to focus on.

Regards,
Swastik Nandakumar Team`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #f5f5f5; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h2 style="color: #E53935; margin-bottom: 8px;">Superhuman Entrepreneur</h2>
    <p style="color: #9e9e9e; font-size: 14px; margin-bottom: 24px;">Your audit report is ready</p>
    <p>Hi ${name},</p>
    <p>Thank you for completing the Business Audit.</p>
    <p>Your personalized audit report is attached as a PDF. It highlights your current growth bottleneck, your priority force, and the next move to focus on.</p>
    <p style="margin-top: 32px;">Regards,<br/>Swastik Nandakumar Team</p>
    <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
    <p style="color: #555; font-size: 12px;">Superhuman Entrepreneur &mdash; Own Your Growth</p>
  </div>
</body>
</html>`

  const filename = sanitizeBusinessNameForFilename(businessName)

  await sendEmailWithAttachment({
    to,
    subject,
    html,
    text,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  })
}
