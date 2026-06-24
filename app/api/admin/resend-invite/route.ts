import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchAction } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { sendEmail } from '@/lib/email'
import { Id } from '@/convex/_generated/dataModel'

function generateTempPassword(len = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const callerProfile = await fetchQuery(api.profiles.getMe, {}, { token })
    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { profileId } = await request.json()
    if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 })

    const targetProfile = await fetchQuery(api.adminUsers.getProfileById, { profileId: profileId as Id<'profiles'> }, { token })
    if (!targetProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const tempPassword = generateTempPassword()

    await fetchAction(
      api.adminUsersActions.resetUserPassword,
      { profileId: targetProfile._id, newPassword: tempPassword },
      { token }
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`

    let emailSent = false
    try {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; }
    .header { background: #800000; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; }
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
    <div class="header"><h1>Dualpix Communications Ltd</h1></div>
    <div class="body">
      <p>Dear <strong>${targetProfile.full_name}</strong>,</p>
      <p>Your Dualpix GMS password has been reset. Your new login credentials are:</p>
      <div class="creds">
        Email: ${targetProfile.email}<br>
        Password: ${tempPassword}
      </div>
      <p style="margin: 24px 0;"><a href="${appUrl}/login" class="btn">Sign In Now &rarr;</a></p>
      <p style="font-size: 12px; color: #888;">Please change your password from Settings after logging in.</p>
      <p>Regards,<br><strong>Dualpix Communications Ltd</strong></p>
    </div>
    <div class="footer"><a href="https://www.dualpix.co.ke">www.dualpix.co.ke</a></div>
  </div>
</body>
</html>`.trim()

      await sendEmail({ to: targetProfile.email, toName: targetProfile.full_name, subject: 'Your Dualpix GMS password has been reset', html })
      emailSent = true
    } catch (err) {
      console.error('Failed to send reset email:', err)
    }

    return NextResponse.json({ success: true, emailSent, tempPassword: emailSent ? undefined : tempPassword })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
