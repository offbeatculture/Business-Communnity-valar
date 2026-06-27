import nodemailer from "nodemailer"
import type Mail from "nodemailer/lib/mailer"

const SMTP_HOST = process.env.SES_SMTP_HOST
const SMTP_PORT = Number(process.env.SES_SMTP_PORT ?? 587)
const SMTP_USERNAME = process.env.SES_SMTP_USERNAME
const SMTP_PASSWORD = process.env.SES_SMTP_PASSWORD
const SMTP_SECURE = SMTP_PORT === 465

const FROM_EMAIL =
  process.env.SES_FROM_EMAIL ??
  "Dr. Valarmathi Srinivasan <noreply@askvalarrmathi.com>"

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000"

const BRAND_NAME = "Daily Breathwork Membership"
const COACH_NAME = "Dr. Valarmathi Srinivasan"
const BRAND_COLOR = "#C99A2E"
const DARK_GREEN = "#102719"
const CARD_GREEN = "#183522"
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

type SendEmailArgs = {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  if (!SMTP_HOST || !SMTP_USERNAME || !SMTP_PASSWORD) {
    console.warn("SES SMTP is not configured. Email skipped.", {
      to,
      subject,
    })
    return null
  }

  return transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text,
  })
}

export async function sendEmailWithAttachment({
  to,
  subject,
  html,
  text,
  attachments,
}: SendEmailArgs & {
  attachments: Mail.Attachment[]
}) {
  if (!SMTP_HOST || !SMTP_USERNAME || !SMTP_PASSWORD) {
    console.warn("SES SMTP is not configured. Email skipped.", {
      to,
      subject,
    })
    return null
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
  name,
  token,
}: {
  to: string
  name?: string
  token: string
}) {
  const greeting = name ? `Hi ${name}` : "Hi there"
  const magicUrl = `${APP_URL}/auth/magic?token=${token}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>

<body style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:${DARK_GREEN}; color:${CREAM}; padding:40px 20px;">
  <div style="max-width:580px; margin:0 auto; background:${CARD_GREEN}; border:1px solid rgba(201,154,46,0.35); border-radius:18px; padding:32px;">
    
    <p style="margin:0 0 10px; color:${BRAND_COLOR}; font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">
      ${BRAND_NAME}
    </p>

    <h2 style="margin:0 0 18px; color:${CREAM}; font-size:28px; line-height:1.25;">
      Your community access is ready
    </h2>

    <p style="margin:0 0 16px; color:${CREAM}; font-size:15px; line-height:1.7;">
      ${greeting},
    </p>

    <p style="margin:0 0 20px; color:#E7DDC8; font-size:15px; line-height:1.7;">
      Your Daily Breathwork Membership access is ready. Click the button below to access your account and continue your setup.
    </p>

    <div style="margin:28px 0;">
      <a href="${magicUrl}" style="background:${BRAND_COLOR}; color:${DARK_GREEN}; padding:14px 28px; border-radius:999px; text-decoration:none; font-weight:700; display:inline-block;">
        Access My Account
      </a>
    </div>

    <p style="margin:0 0 14px; color:#CDBF9F; font-size:13px; line-height:1.6;">
      If the button does not work, copy and paste this link into your browser:
    </p>

    <p style="word-break:break-all; margin:0; color:#CDBF9F; font-size:12px; line-height:1.6;">
      ${magicUrl}
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

Your Daily Breathwork Membership access is ready.

Access your account here:
${magicUrl}

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
  const dashboardUrl = `${APP_URL}/dashboard`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>

<body style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:${DARK_GREEN}; color:${CREAM}; padding:40px 20px;">
  <div style="max-width:580px; margin:0 auto; background:${CARD_GREEN}; border:1px solid rgba(201,154,46,0.35); border-radius:18px; padding:32px;">
    
    <p style="margin:0 0 10px; color:${BRAND_COLOR}; font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">
      ${BRAND_NAME}
    </p>

    <h2 style="margin:0 0 18px; color:${CREAM}; font-size:28px; line-height:1.25;">
      Payment received
    </h2>

    <p style="margin:0 0 16px; color:${CREAM}; font-size:15px; line-height:1.7;">
      ${greeting},
    </p>

    <p style="margin:0 0 20px; color:#E7DDC8; font-size:15px; line-height:1.7;">
      Thank you. Your payment for the Daily Breathwork Membership has been received successfully.
    </p>

    <div style="background:${DARK_GREEN}; border:1px solid rgba(201,154,46,0.25); border-radius:14px; padding:20px; margin:24px 0;">
      <p style="margin:0 0 10px; color:#E7DDC8; font-size:14px;">
        <strong style="color:${CREAM};">Membership:</strong> ${planLabel}
      </p>

      <p style="margin:0; color:#E7DDC8; font-size:14px;">
        <strong style="color:${CREAM};">Amount:</strong> ${amount}
      </p>
    </div>

    <div style="margin:28px 0;">
      <a href="${dashboardUrl}" style="background:${BRAND_COLOR}; color:${DARK_GREEN}; padding:14px 28px; border-radius:999px; text-decoration:none; font-weight:700; display:inline-block;">
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

Thank you. Your payment has been received successfully.

Membership: ${planLabel}
Amount: ${amount}

Go to community:
${dashboardUrl}

${BRAND_NAME}
${COACH_NAME}`

  return sendEmail({
    to,
    subject: "Payment received — Breathwork Community",
    html,
    text,
  })
}

export async function sendWelcomeEmail({
  to,
  name,
  token,
}: {
  to: string
  name?: string
  token: string
}) {
  const greeting = name ? `Hi ${name}` : "Hi there"

  const loginUrl = `${APP_URL}/auth/magic?token=${token}`
  const whatsappUrl = "https://chat.whatsapp.com/KTATwSgE2fsLdfh0jj7lPp"
  const zoomUrl =
    "https://zoom.us/j/93886940408?pwd=AFhvJOdgWMRMYoYiaOqtOyKb3yBXAB.1"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>

<body style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:${DARK_GREEN}; color:${CREAM}; padding:40px 20px;">
  <div style="max-width:620px; margin:0 auto; background:${CARD_GREEN}; border:1px solid rgba(201,154,46,0.35); border-radius:18px; padding:32px;">
    
    <p style="margin:0 0 10px; color:${BRAND_COLOR}; font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">
      ${BRAND_NAME}
    </p>

    <h2 style="margin:0 0 18px; color:${CREAM}; font-size:28px; line-height:1.25;">
      Welcome to the Daily Breathwork Membership
    </h2>

    <p style="margin:0 0 16px; color:${CREAM}; font-size:15px; line-height:1.7;">
      ${greeting},
    </p>

    <p style="margin:0 0 22px; color:#E7DDC8; font-size:15px; line-height:1.7;">
      Congratulations on joining the <strong style="color:${CREAM};">Daily Breathwork Membership</strong>.
    </p>

    <div style="background:${DARK_GREEN}; border:1px solid rgba(201,154,46,0.25); border-radius:14px; padding:20px; margin:24px 0;">
      <h3 style="margin:0 0 12px; color:${CREAM}; font-size:18px;">
        1. Login to the Community
      </h3>

      <a href="${loginUrl}" style="background:${BRAND_COLOR}; color:${DARK_GREEN}; padding:13px 24px; border-radius:999px; text-decoration:none; font-weight:700; display:inline-block;">
        Login to Community
      </a>
    </div>

    <div style="background:${DARK_GREEN}; border:1px solid rgba(201,154,46,0.25); border-radius:14px; padding:20px; margin:24px 0;">
      <h3 style="margin:0 0 12px; color:${CREAM}; font-size:18px;">
        2. Join WhatsApp Community
      </h3>

      <a href="${whatsappUrl}" style="background:${BRAND_COLOR}; color:${DARK_GREEN}; padding:13px 24px; border-radius:999px; text-decoration:none; font-weight:700; display:inline-block;">
        Join WhatsApp Community
      </a>
    </div>

    <div style="background:${DARK_GREEN}; border:1px solid rgba(201,154,46,0.25); border-radius:14px; padding:20px; margin:24px 0;">
      <h3 style="margin:0 0 12px; color:${CREAM}; font-size:18px;">
        3. Daily Morning LIVE Session
      </h3>

      <p style="margin:0 0 10px; color:#E7DDC8; font-size:14px; line-height:1.6;">
        <strong style="color:${CREAM};">Session:</strong> Daily Breathwork Practice + Workout with KRS
      </p>

      <p style="margin:0 0 10px; color:#E7DDC8; font-size:14px; line-height:1.6;">
        <strong style="color:${CREAM};">Day:</strong> Monday to Friday
      </p>

      <p style="margin:0 0 10px; color:#E7DDC8; font-size:14px; line-height:1.6;">
        <strong style="color:${CREAM};">Monday, Tuesday & Thursday:</strong><br />
        6:45 AM to 7:15 AM IST — Breathwork Practice
      </p>

      <p style="margin:0 0 18px; color:#E7DDC8; font-size:14px; line-height:1.6;">
        <strong style="color:${CREAM};">Wednesday & Friday:</strong><br />
        6:15 AM to 7:15 AM IST — Workout + Breathwork Practice
      </p>

      <a href="${zoomUrl}" style="background:${BRAND_COLOR}; color:${DARK_GREEN}; padding:13px 24px; border-radius:999px; text-decoration:none; font-weight:700; display:inline-block;">
        Join Daily Zoom Session
      </a>

      <p style="margin:18px 0 6px; color:#E7DDC8; font-size:14px;">
        <strong style="color:${CREAM};">Meeting ID:</strong> 938 8694 0408
      </p>

      <p style="margin:0; color:#E7DDC8; font-size:14px;">
        <strong style="color:${CREAM};">Passcode:</strong> 123
      </p>
    </div>

    <p style="margin:24px 0 0; color:#CDBF9F; font-size:13px; line-height:1.6;">
      Please save this email so you can easily access your community login, WhatsApp group, and daily Zoom session.
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

Congratulations on joining the Daily Breathwork Membership.

1. Login to the community:
${loginUrl}

2. Join Whatsapp Community here:
${whatsappUrl}

3. DAILY Morning LIVE Session - Daily Breathwork Practice + Workout with KRS

Day: Monday to Friday

Time:
Monday, Tuesday & Thursday:
6:45 AM to 7:15 AM IST - Breathwork Practice

Wednesday & Friday:
6:15 AM to 7:15 AM IST - Workout + Breathwork Practice

Zoom Meeting Daily Link:
${zoomUrl}

Meeting ID: 938 8694 0408
Passcode: 123

Please save this email so you can easily access your community login, WhatsApp group, and daily Zoom session.

${BRAND_NAME}
${COACH_NAME}`

  return sendEmail({
    to,
    subject: "Welcome to the Daily Breathwork Membership",
    html,
    text,
  })
}