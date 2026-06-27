import nodemailer from "nodemailer"

const SMTP_HOST =
  process.env.SES_SMTP_HOST ?? "email-smtp.ap-south-1.amazonaws.com"

const SMTP_PORT = Number(process.env.SES_SMTP_PORT ?? "587")
const SMTP_SECURE = SMTP_PORT === 465

const SMTP_USERNAME = process.env.SES_SMTP_USERNAME ?? ""
const SMTP_PASSWORD = process.env.SES_SMTP_PASSWORD ?? ""

const FROM_EMAIL =
  process.env.SES_FROM_EMAIL ??
  "Dr. Valarmathi Srinivasan <noreply@valarmathisrinivasan.in>"

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000"

const BRAND_NAME = "Daily Breathwork Community"
const COACH_NAME = "Dr. Valarmathi Srinivasan"
const BRAND_COLOR = "#C99A2E"
const DARK_GREEN = "#102719"
const CREAM = "#FFF8EA"

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD,
  },
})

type SendEmailParams = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams) {
  if (!SMTP_USERNAME || !SMTP_PASSWORD) {
    throw new Error("Missing SES SMTP credentials")
  }

  return transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text,
  })
}

type SendEmailWithAttachmentParams = SendEmailParams & {
  attachments: NonNullable<nodemailer.SendMailOptions["attachments"]>
}

export async function sendEmailWithAttachment({
  to,
  subject,
  html,
  text,
  attachments,
}: SendEmailWithAttachmentParams) {
  if (!SMTP_USERNAME || !SMTP_PASSWORD) {
    throw new Error("Missing SES SMTP credentials")
  }

  return transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text,
    attachments,
  })
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
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:${DARK_GREEN}; color:${CREAM}; padding:40px 20px;">
  <div style="max-width:520px; margin:0 auto; background:#183522; border:1px solid rgba(201,154,46,0.35); border-radius:18px; padding:32px;">
    <p style="margin:0 0 10px; color:${BRAND_COLOR}; font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">
      ${BRAND_NAME}
    </p>

    <h2 style="margin:0 0 8px; color:${CREAM}; font-size:26px; line-height:1.2;">
      Your community access is ready
    </h2>

    <p style="margin:0 0 24px; color:#D8C9A7; font-size:14px;">
      Guided by ${COACH_NAME}
    </p>

    <p style="margin:0 0 14px; color:${CREAM}; font-size:15px; line-height:1.7;">
      ${greeting},
    </p>

    <p style="margin:0 0 18px; color:#E7DDC8; font-size:15px; line-height:1.7;">
      Your Breathwork Community membership is active. Click the button below to access your account and continue your daily practice.
    </p>

    <div style="margin:30px 0;">
      <a href="${magicUrl}" style="background:${BRAND_COLOR}; color:#102719; padding:14px 28px; border-radius:999px; text-decoration:none; font-weight:700; display:inline-block;">
        Access My Account
      </a>
    </div>

    <p style="margin:0 0 12px; color:#CDBF9F; font-size:13px; line-height:1.6;">
      This secure link expires in 20 minutes. If it expires, you can request a new access link from the login page.
    </p>

    <p style="margin:0; color:#CDBF9F; font-size:13px; line-height:1.6;">
      If you did not request this, you can safely ignore this email.
    </p>

    <hr style="border:none; border-top:1px solid rgba(201,154,46,0.25); margin:28px 0;" />

    <p style="margin:0; color:#AFA17F; font-size:12px; line-height:1.6;">
      ${BRAND_NAME}<br />
      ${COACH_NAME}
    </p>
  </div>
</body>
</html>`

  const text = `${greeting},

Your Breathwork Community membership is active.

Access your account here:
${magicUrl}

This secure link expires in 20 minutes. If it expires, you can request a new access link from the login page.

${BRAND_NAME}
${COACH_NAME}`

  return sendEmail({
    to,
    subject: "Your Breathwork Community access is ready",
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
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:${DARK_GREEN}; color:${CREAM}; padding:40px 20px;">
  <div style="max-width:520px; margin:0 auto; background:#183522; border:1px solid rgba(201,154,46,0.35); border-radius:18px; padding:32px;">
    <p style="margin:0 0 10px; color:${BRAND_COLOR}; font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">
      ${BRAND_NAME}
    </p>

    <h2 style="margin:0 0 18px; color:${CREAM}; font-size:26px; line-height:1.2;">
      Payment received
    </h2>

    <p style="margin:0 0 14px; color:${CREAM}; font-size:15px; line-height:1.7;">
      ${greeting},
    </p>

    <p style="margin:0 0 18px; color:#E7DDC8; font-size:15px; line-height:1.7;">
      Thank you. Your payment has been received and your Breathwork Community membership is active.
    </p>

    <div style="background:#102719; border:1px solid rgba(201,154,46,0.25); border-radius:14px; padding:18px; margin:24px 0;">
      <p style="margin:0 0 10px; color:#E7DDC8; font-size:14px;">
        <strong style="color:${CREAM};">Membership:</strong> ${planLabel}
      </p>
      <p style="margin:0; color:#E7DDC8; font-size:14px;">
        <strong style="color:${CREAM};">Amount:</strong> ${amount}
      </p>
    </div>

    <p style="margin:0 0 18px; color:#E7DDC8; font-size:15px; line-height:1.7;">
      You can now access the community, session recordings, and daily practice resources.
    </p>

    <div style="margin:28px 0;">
      <a href="${APP_URL}/dashboard" style="background:${BRAND_COLOR}; color:#102719; padding:14px 28px; border-radius:999px; text-decoration:none; font-weight:700; display:inline-block;">
        Go to Community
      </a>
    </div>

    <hr style="border:none; border-top:1px solid rgba(201,154,46,0.25); margin:28px 0;" />

    <p style="margin:0; color:#AFA17F; font-size:12px; line-height:1.6;">
      ${BRAND_NAME}<br />
      ${COACH_NAME}
    </p>
  </div>
</body>
</html>`

  const text = `${greeting},

Thank you. Your payment has been received and your Breathwork Community membership is active.

Membership: ${planLabel}
Amount: ${amount}

You can now access the community, session recordings, and daily practice resources.

Go to community:
${APP_URL}/dashboard

${BRAND_NAME}
${COACH_NAME}`

  return sendEmail({
    to,
    subject: "Payment received — Breathwork Community",
    html,
    text,
  })
}