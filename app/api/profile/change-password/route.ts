import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchAction } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export async function POST(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    const profile = await fetchQuery(api.profiles.getMe, {}, { token })
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
      await fetchAction(
        api.adminUsersActions.changePassword,
        { profileId: profile._id, currentPassword, newPassword },
        { token }
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password change failed'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
