import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const serverSupabase = createClient()
    const { data: { user } } = await serverSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const { full_name, email, role } = await request.json()

    if (!full_name || !email || !role) {
      return NextResponse.json({ error: 'Full name, email, and role are required' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`

    // generateLink creates the auth user AND returns the invite URL in one call.
    // This guarantees action_link is always populated.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { full_name },
        redirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (linkError || !linkData?.user?.id) {
      return NextResponse.json(
        { error: linkError?.message ?? 'Failed to generate invite link' },
        { status: 400 }
      )
    }

    const inviteUrl = linkData.properties?.action_link
    const newUserId = linkData.user.id

    // Insert profile row for the new user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (admin as any)
      .from('profiles')
      .insert({
        id: newUserId,
        full_name,
        email,
        role,
        is_active: true,
      })

    if (profileError) {
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    // Send invite email
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
      <p>You have been invited to Dualpix GMS</p>
    </div>
    <div class="body">
      <p>Dear <strong>${full_name}</strong>,</p>
      <p>You have been invited to join <strong>Dualpix Guest Management System</strong> as an <strong>${role === 'super_admin' ? 'Super Admin' : 'Event Manager'}</strong>.</p>
      <p>Click the button below to set your password and get started:</p>
      <p style="margin: 24px 0;">
        <a href="${inviteUrl}" class="btn">Accept Invitation &rarr;</a>
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

      await sendEmail({
        to: email,
        toName: full_name,
        subject: "You've been invited to Dualpix GMS",
        html,
      })
      emailSent = true
    } catch (emailErr) {
      console.error('Failed to send invite email:', emailErr)
    }

    return NextResponse.json({ success: true, userId: newUserId, inviteUrl, emailSent })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
