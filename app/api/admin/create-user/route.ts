import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchAction } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { sendEmail } from '@/lib/email'

function generateTempPassword(len = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await fetchQuery(api.profiles.getMe, {}, { token })
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { full_name, email, role } = await request.json()
    if (!full_name || !email || !role) {
      return NextResponse.json({ error: 'Full name, email, and role are required' }, { status: 400 })
    }

    const tempPassword = generateTempPassword()

    try {
      await fetchAction(api.adminUsersActions.createUser, { full_name, email, role, password: tempPassword }, { token })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`

    let emailSent = false
    try {
      const html = `
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
    .creds { background: #f5f5f5; border-radius: 6px; padding: 16px; font-family: monospace; font-size: 14px; margin: 16px 0; }
    .btn { display: inline-block; background: #800000; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; }
    .footer { background: #f5f5f5; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; }
    a { color: #800000; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dualpix Communications Ltd</h1>
      <p>You have been invited to Dualpix GMS</p>
    </div>
    <div class="body">
      <p>Dear <strong>${full_name}</strong>,</p>
      <p>You have been invited to join <strong>Dualpix Guest Management System</strong> as an <strong>${role === 'super_admin' ? 'Super Admin' : 'Event Manager'}</strong>.</p>
      <p>Your login credentials are:</p>
      <div class="creds">
        Email: ${email}<br>
        Password: ${tempPassword}
      </div>
      <p style="margin: 24px 0;">
        <a href="${appUrl}/login" class="btn">Sign In Now &rarr;</a>
      </p>
      <p style="font-size: 12px; color: #888;">Please change your password from Settings after your first login.</p>
      <p>Regards,<br><strong>Dualpix Communications Ltd</strong></p>
    </div>
    <div class="footer">
      <a href="https://www.dualpix.co.ke">www.dualpix.co.ke</a>
      &nbsp;·&nbsp; The Don Bosco MSSC Center, Matumbatu Road Upper Hill, Nairobi
    </div>
  </div>
</body>
</html>`.trim()

      await sendEmail({ to: email, toName: full_name, subject: "You've been invited to Dualpix GMS", html })
      emailSent = true
    } catch (emailErr) {
      console.error('Failed to send invite email:', emailErr)
    }

    return NextResponse.json({ success: true, emailSent, tempPassword: emailSent ? undefined : tempPassword })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
