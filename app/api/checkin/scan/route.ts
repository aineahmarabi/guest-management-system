import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { sendEmail, buildCheckinConfirmationHtml } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ticketId, eventId } = await request.json()
    if (!ticketId) {
      return NextResponse.json({ status: 'invalid', message: 'No ticket ID provided' }, { status: 400 })
    }

    const guest = await fetchQuery(
      api.guests.getByTicketId,
      { ticket_id: ticketId.trim(), ...(eventId ? { event_id: eventId } : {}) },
      { token }
    )

    if (!guest) {
      return NextResponse.json({ status: 'invalid', message: 'INVALID TICKET — Gate Crasher' })
    }

    if (guest.checked_in) {
      return NextResponse.json({
        status: 'already_checked_in',
        message: `ALREADY CHECKED IN — ${guest.full_name}`,
        guestName: guest.full_name,
        checkedInAt: guest.checked_in_at,
        escortCount: guest.escort_count,
      })
    }

    await fetchMutation(api.guests.checkIn, { id: guest._id }, { token })

    const checkedInAt = new Date().toISOString()

    fetchQuery(api.events.getById, { id: guest.event_id }, { token })
      .then(event => {
        if (!event) return
        const formattedDate = new Date(event.event_date).toLocaleDateString('en-KE', {
          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        })
        const formattedTime = new Date(checkedInAt).toLocaleTimeString('en-KE', {
          hour: '2-digit', minute: '2-digit',
        })
        const html = buildCheckinConfirmationHtml({
          guestName: guest.full_name,
          eventName: event.name,
          eventDate: formattedDate,
          eventTime: event.event_time,
          venue: event.venue,
          checkedInAt: formattedTime,
          escortCount: guest.escort_count,
        })
        sendEmail({ to: guest.email, toName: guest.full_name, subject: `Attendance Confirmed — ${event.name}`, html }).catch(() => {})
      })
      .catch(() => {})

    return NextResponse.json({
      status: 'success',
      message: `ADMITTED — ${guest.full_name}`,
      guestName: guest.full_name,
      escortCount: guest.escort_count,
      checkedInAt,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
