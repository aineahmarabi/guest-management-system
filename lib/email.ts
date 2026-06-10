import nodemailer from 'nodemailer'

interface EmailPayload {
  to: string
  toName: string
  subject: string
  html: string
  attachments?: {
    filename: string
    content: Buffer
    contentType: string
  }[]
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const transporter = getTransporter()

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS ?? process.env.GMAIL_USER}>`,
    to: `"${payload.toName}" <${payload.to}>`,
    subject: payload.subject,
    html: payload.html,
    attachments: payload.attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    })),
  })
}

export function buildCheckinConfirmationHtml(params: {
  guestName: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  checkedInAt: string
  escortCount: number
}): string {
  const escortLine = params.escortCount > 0
    ? `<p>Your party of <strong>${params.escortCount} escort(s)</strong> has also been admitted.</p>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; }
    .header { background: #800000; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; }
    .header p { color: #ffcccc; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; color: #1a1a1a; }
    .body p { line-height: 1.6; margin: 0 0 16px; }
    .badge { display: inline-block; background: #f0fff4; border: 1px solid #6ee7b7; color: #065f46; font-size: 14px; font-weight: bold; padding: 10px 20px; border-radius: 6px; margin: 8px 0 20px; }
    .details { background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .details p { margin: 4px 0; font-size: 14px; }
    .details strong { color: #800000; }
    .footer { background: #f5f5f5; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; }
    a { color: #800000; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dualpix Communications Ltd</h1>
      <p>Attendance Confirmation</p>
    </div>
    <div class="body">
      <p>Dear <strong>${params.guestName}</strong>,</p>
      <div class="badge">✔ Attendance Confirmed</div>
      <p>Your attendance at <strong>${params.eventName}</strong> has been successfully recorded.</p>
      <div class="details">
        <p><strong>Event:</strong> ${params.eventName}</p>
        <p><strong>Date:</strong> ${params.eventDate}</p>
        <p><strong>Time:</strong> ${params.eventTime}</p>
        <p><strong>Venue:</strong> ${params.venue}</p>
        <p><strong>Checked In:</strong> ${params.checkedInAt}</p>
      </div>
      ${escortLine}
      <p>Thank you for joining us. We hope you enjoy the event!</p>
      <p>Regards,<br><strong>Dualpix Communications Ltd</strong></p>
    </div>
    <div class="footer">
      <a href="https://www.dualpix.co.ke">www.dualpix.co.ke</a>
      &nbsp;·&nbsp; The Don Bosco MSSC Center, Matumbatu Road Upper Hill, Nairobi
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function buildInviteEmailHtml(params: {
  guestName: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  escortCount: number
}): string {
  const escortLine = params.escortCount > 0
    ? `<p>You are authorised to arrive with <strong>${params.escortCount} escort(s)</strong>.</p>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; }
    .header { background: #800000; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; }
    .header p { color: #ffcccc; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; color: #1a1a1a; }
    .body p { line-height: 1.6; margin: 0 0 16px; }
    .details { background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .details p { margin: 4px 0; font-size: 14px; }
    .details strong { color: #800000; }
    .footer { background: #f5f5f5; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; }
    a { color: #800000; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dualpix Communications Ltd</h1>
      <p>Guest Invitation</p>
    </div>
    <div class="body">
      <p>Dear <strong>${params.guestName}</strong>,</p>
      <p>You are cordially invited to <strong>${params.eventName}</strong>.</p>
      <div class="details">
        <p><strong>Date:</strong> ${params.eventDate}</p>
        <p><strong>Time:</strong> ${params.eventTime}</p>
        <p><strong>Venue:</strong> ${params.venue}</p>
      </div>
      <p>Please find your ticket attached. Present it (printed or on your device) at the entrance.</p>
      ${escortLine}
      <p>We look forward to seeing you.</p>
      <p>Regards,<br><strong>Dualpix Communications Ltd</strong></p>
    </div>
    <div class="footer">
      <a href="https://www.dualpix.co.ke">www.dualpix.co.ke</a>
      &nbsp;·&nbsp; The Don Bosco MSSC Center, Matumbatu Road Upper Hill, Nairobi
    </div>
  </div>
</body>
</html>
  `.trim()
}
