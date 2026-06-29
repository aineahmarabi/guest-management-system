import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

function extractTicketId(raw: string): string {
  const trimmed = raw.trim()
  try {
    const url = new URL(trimmed)
    const parts = url.pathname.split('/')
    return parts[parts.length - 1] || trimmed
  } catch {
    return trimmed
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const raw = request.nextUrl.searchParams.get('ticketId')
    if (!raw) {
      return NextResponse.json({ status: 'invalid', message: 'No ticket ID provided' })
    }

    const ticketId = extractTicketId(raw)

    const guest = await fetchQuery(api.guests.getByTicketId, { ticket_id: ticketId }, { token })

    if (!guest) {
      return NextResponse.json({ status: 'invalid' })
    }

    const event = await fetchQuery(api.events.getById, { id: guest.event_id }, { token })

    return NextResponse.json({
      status: 'found',
      guestName: guest.full_name,
      eventName: event?.name ?? 'Unknown Event',
      escortCount: guest.escort_count,
      checkedIn: guest.checked_in,
      checkedInAt: guest.checked_in_at ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
