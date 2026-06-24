import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { generateTicketId } from '@/lib/ticket'
import { generateTicketPDF } from '@/lib/pdf'
import { sendEmail, buildInviteEmailHtml } from '@/lib/email'
import { Id } from '@/convex/_generated/dataModel'

export async function POST(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId, guests } = await request.json()
    if (!eventId || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json({ error: 'eventId and guests array are required' }, { status: 400 })
    }

    const event = await fetchQuery(api.events.getById, { id: eventId as Id<'events'> }, { token })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const profile = await fetchQuery(api.profiles.getMe, {}, { token })
    const createdBy = profile?._id

    const formattedDate = new Date(event.event_date).toLocaleDateString('en-KE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

    let imported = 0
    const errors: string[] = []

    for (const g of guests) {
      const full_name = (g.full_name ?? '').trim()
      const email = (g.email ?? '').trim().toLowerCase()
      const phone = (g.phone ?? '').trim() || undefined
      const escort_count = Math.max(0, parseInt(g.escort_count ?? '0') || 0)

      if (!full_name || !email) {
        errors.push(`Skipped — missing name or email: "${full_name || '?'}"`)
        continue
      }

      const ticketId = generateTicketId(event._id)

      try {
        const guestId = await fetchMutation(
          api.guests.create,
          { event_id: event._id, full_name, email, phone, ticket_id: ticketId, escort_count, created_by: createdBy },
          { token }
        )

        try {
          const pdfBytes = await generateTicketPDF({
            guestName: full_name,
            guestEmail: email,
            eventName: event.name,
            eventDate: formattedDate,
            eventTime: event.event_time,
            venue: event.venue,
            ticketId,
            escortCount: escort_count,
          })

          const html = buildInviteEmailHtml({
            guestName: full_name,
            eventName: event.name,
            eventDate: formattedDate,
            eventTime: event.event_time,
            venue: event.venue,
            escortCount: escort_count,
          })

          await sendEmail({
            to: email,
            toName: full_name,
            subject: `Your Invitation — ${event.name}`,
            html,
            attachments: [{ filename: `ticket-${ticketId}.pdf`, content: Buffer.from(pdfBytes), contentType: 'application/pdf' }],
          })

          await fetchMutation(api.guests.markEmailSent, { id: guestId as Id<'guests'> }, { token })
        } catch {
          // Email failed — guest imported, can resend manually
        }

        imported++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Failed to import "${full_name}": ${message}`)
      }
    }

    return NextResponse.json({ imported, errors })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
