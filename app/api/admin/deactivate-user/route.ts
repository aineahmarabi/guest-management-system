import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export async function POST(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await fetchQuery(api.profiles.getMe, {}, { token })
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { profileId } = await request.json()
    if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 })

    if (profileId === profile._id) {
      return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 })
    }

    await fetchMutation(api.adminUsers.deactivateUser, { profileId: profileId as Id<'profiles'> }, { token })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
