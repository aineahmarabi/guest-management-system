import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export async function PATCH(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { full_name } = await request.json()
    if (!full_name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    await fetchMutation(api.profiles.updateName, { full_name: full_name.trim() }, { token })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
