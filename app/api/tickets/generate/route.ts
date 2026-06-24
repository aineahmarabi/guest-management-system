import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { generateTicketPDF } from '@/lib/pdf'
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

    const pdfBytes = await generateTicketPDF({
      guestName: guest.full_name,
      guestEmail: guest.email,
      eventName: event.name,
      eventDate: new Date(event.event_date).toLocaleDateString('en-KE', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      }),
      eventTime: event.event_time,
      venue: event.venue,
      ticketId: guest.ticket_id,
      escortCount: guest.escort_count,
    })

    await fetchMutation(api.guests.markPdfGenerated, { id: guest._id }, { token })

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${guest.ticket_id}.pdf"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
