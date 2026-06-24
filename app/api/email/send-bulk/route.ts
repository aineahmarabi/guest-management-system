import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { generateTicketPDF } from '@/lib/pdf'
import { sendEmail, buildInviteEmailHtml } from '@/lib/email'
import { Id } from '@/convex/_generated/dataModel'

export async function POST(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = await request.json()
    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 })

    const event = await fetchQuery(api.events.getById, { id: eventId as Id<'events'> }, { token })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const guests = await fetchQuery(api.guests.listByEventUnsent, { event_id: event._id }, { token })
    if (guests.length === 0) return NextResponse.json({ sent: 0, failed: 0 })

    const formattedDate = new Date(event.event_date).toLocaleDateString('en-KE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

    let sent = 0
    let failed = 0

    for (const guest of guests) {
      try {
        const pdfBytes = await generateTicketPDF({
          guestName: guest.full_name,
          guestEmail: guest.email,
          eventName: event.name,
          eventDate: formattedDate,
          eventTime: event.event_time,
          venue: event.venue,
          ticketId: guest.ticket_id,
          escortCount: guest.escort_count,
        })

        const html = buildInviteEmailHtml({
          guestName: guest.full_name,
          eventName: event.name,
          eventDate: formattedDate,
          eventTime: event.event_time,
          venue: event.venue,
          escortCount: guest.escort_count,
        })

        await sendEmail({
          to: guest.email,
          toName: guest.full_name,
          subject: `Your Invitation — ${event.name}`,
          html,
          attachments: [{ filename: `ticket-${guest.ticket_id}.pdf`, content: Buffer.from(pdfBytes), contentType: 'application/pdf' }],
        })

        await Promise.all([
          fetchMutation(api.guests.markEmailSent, { id: guest._id }, { token }),
          fetchMutation(api.emailLogs.insert, { event_id: event._id, guest_id: guest._id, status: 'sent' }, { token }),
        ])

        sent++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await fetchMutation(api.emailLogs.insert, { event_id: event._id, guest_id: guest._id, status: 'failed', error_message: message }, { token })
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
