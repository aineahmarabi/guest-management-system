import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const serverSupabase = createClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData } = await (admin as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profileData as { role: string } | null)?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    // Fetch target user profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetProfile } = await (admin as any)
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', userId)
      .single()

    if (!targetProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { full_name, email, role } = targetProfile as { full_name: string; email: string; role: string }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`

    // Generate a recovery link — lets the user set/reset their password
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/callback?next=/update-password` },
    })

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: linkError?.message ?? 'Failed to generate link' }, { status: 500 })
    }

    const inviteUrl = linkData.properties.action_link

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
    .btn { display: inline-block; background: #800000; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; }
    .footer { background: #f5f5f5; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; }
    a { color: #800000; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dualpix Communications Ltd</h1>
      <p>Set up your Dualpix GMS account</p>
    </div>
    <div class="body">
      <p>Dear <strong>${full_name}</strong>,</p>
      <p>Your invitation to <strong>Dualpix Guest Management System</strong> as <strong>${role === 'super_admin' ? 'Super Admin' : 'Event Manager'}</strong> has been resent.</p>
      <p>Click the button below to set your password and access your account:</p>
      <p style="margin: 24px 0;">
        <a href="${inviteUrl}" class="btn">Set My Password &rarr;</a>
      </p>
      <p style="font-size: 12px; color: #888;">
        Button not working? Copy and paste this link into your browser:<br>
        <a href="${inviteUrl}" style="word-break: break-all;">${inviteUrl}</a>
      </p>
      <p>Regards,<br><strong>Dualpix Communications Ltd</strong></p>
    </div>
    <div class="footer">
      <a href="https://www.dualpix.co.ke">www.dualpix.co.ke</a>
      &nbsp;·&nbsp; The Don Bosco MSSC Center, Matumbatu Road Upper Hill, Nairobi
    </div>
  </div>
</body>
</html>`.trim()

      await sendEmail({ to: email, toName: full_name, subject: 'Set up your Dualpix GMS account', html })
      emailSent = true
    } catch (err) {
      console.error('Failed to send resend invite email:', err)
    }

    return NextResponse.json({ success: true, inviteUrl, emailSent })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
