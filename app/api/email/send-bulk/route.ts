import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateTicketPDF } from '@/lib/pdf'
import { sendEmail, buildInviteEmailHtml } from '@/lib/email'
import { Guest, Event } from '@/types/supabase'

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = createClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (!eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const event = eventData as Event

    const { data: guestData } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .eq('email_sent', false)

    const guests = (guestData ?? []) as Guest[]

    if (guests.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    let sent = 0
    let failed = 0

    const formattedDate = new Date(event.event_date).toLocaleDateString('en-KE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

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
          attachments: [
            {
              filename: `ticket-${guest.ticket_id}.pdf`,
              content: Buffer.from(pdfBytes),
              contentType: 'application/pdf',
            },
          ],
        })

        await Promise.all([
          db.from('guests').update({ email_sent: true, pdf_generated: true }).eq('id', guest.id),
          db.from('email_logs').insert({ event_id: eventId, guest_id: guest.id, status: 'sent' }),
        ])

        sent++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await db.from('email_logs').insert({
          event_id: eventId,
          guest_id: guest.id,
          status: 'failed',
          error_message: message,
        })
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
