import { NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)

    const count = await fetchQuery(
      api.guests.checkedInToday,
      { since: todayMidnight.toISOString() },
      { token }
    )

    return NextResponse.json({ checkedInToday: count ?? 0 })
  } catch {
    return NextResponse.json({ checkedInToday: 0 }, { status: 500 })
  }
}
