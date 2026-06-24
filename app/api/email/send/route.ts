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

    const { guestId } = await request.json()
    if (!guestId) return NextResponse.json({ error: 'guestId is required' }, { status: 400 })

    const guest = await fetchQuery(api.guests.getById, { id: guestId as Id<'guests'> }, { token })
    if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 })

    const event = await fetchQuery(api.events.getById, { id: guest.event_id }, { token })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const formattedDate = new Date(event.event_date).toLocaleDateString('en-KE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

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

    try {
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

      return NextResponse.json({ success: true })
    } catch (emailError: unknown) {
      const message = emailError instanceof Error ? emailError.message : 'Unknown error'
      await fetchMutation(api.emailLogs.insert, { event_id: event._id, guest_id: guest._id, status: 'failed', error_message: message }, { token })
      return NextResponse.json({ error: 'Email failed to send', detail: message }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
