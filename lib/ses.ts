import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

const ses = new SESClient({
  region: process.env.AWS_SES_REGION ?? "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY ?? "",
  },
})

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "noreply@superhumanentrepreneur.com"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

type SendEmailParams = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: html, Charset: "UTF-8" },
        Text: { Data: text, Charset: "UTF-8" },
      },
    },
  })

  return ses.send(command)
}

export async function sendMagicLinkEmail({
  to,
  token,
  name,
}: {
  to: string
  token: string
  name?: string
}) {
  const magicUrl = `${APP_URL}/auth/magic?token=${token}`
  const greeting = name ? `Hi ${name}` : "Hi there"

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #f5f5f5; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h2 style="color: #E53935; margin-bottom: 8px;">Superhuman Entrepreneur</h2>
    <p style="color: #9e9e9e; font-size: 14px; margin-bottom: 24px;">Your subscription is active</p>
    <p>${greeting},</p>
    <p>Your subscription is now active. Click the button below to access your account and set your password.</p>
    <div style="margin: 32px 0;">
      <a href="${magicUrl}" style="background: #E53935; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Access Your Account
      </a>
    </div>
    <p style="color: #9e9e9e; font-size: 13px;">This link expires in 20 minutes. If it has expired, you can request a new one from the payment success page.</p>
    <p style="color: #9e9e9e; font-size: 13px;">If you didn't sign up, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
    <p style="color: #555; font-size: 12px;">Superhuman Entrepreneur &mdash; Own Your Growth</p>
  </div>
</body>
</html>`

  const text = `${greeting},

Your subscription is now active. Click the link below to access your account and set your password:

${magicUrl}

This link expires in 20 minutes.

— Superhuman Entrepreneur`

  return sendEmail({
    to,
    subject: "Your account is ready — Superhuman Entrepreneur",
    html,
    text,
  })
}

export async function sendPaymentConfirmationEmail({
  to,
  name,
  planLabel,
  amount,
}: {
  to: string
  name?: string
  planLabel: string
  amount: string
}) {
  const greeting = name ? `Hi ${name}` : "Hi there"

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #f5f5f5; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h2 style="color: #E53935; margin-bottom: 8px;">Superhuman Entrepreneur</h2>
    <p>${greeting},</p>
    <p>We've received your payment. Here's a summary:</p>
    <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px;"><strong>Plan:</strong> ${planLabel}</p>
      <p style="margin: 0;"><strong>Amount:</strong> ${amount}</p>
    </div>
    <p style="color: #9e9e9e; font-size: 13px;">Your GST invoice will be available in your account under Subscription settings.</p>
    <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
    <p style="color: #555; font-size: 12px;">Superhuman Entrepreneur &mdash; Own Your Growth</p>
  </div>
</body>
</html>`

  const text = `${greeting},

We've received your payment.

Plan: ${planLabel}
Amount: ${amount}

Your GST invoice will be available in your account under Subscription settings.

— Superhuman Entrepreneur`

  return sendEmail({
    to,
    subject: "Payment received — Superhuman Entrepreneur",
    html,
    text,
  })
}
