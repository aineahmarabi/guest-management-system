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

    const { guestId } = await request.json()

    if (!guestId) {
      return NextResponse.json({ error: 'guestId is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('guests')
      .select('*, events(*)')
      .eq('id', guestId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    const guest = data as Guest & { events: Event }
    const event = guest.events

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
        attachments: [
          {
            filename: `ticket-${guest.ticket_id}.pdf`,
            content: Buffer.from(pdfBytes),
            contentType: 'application/pdf',
          },
        ],
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      await Promise.all([
        db.from('guests').update({ email_sent: true, pdf_generated: true }).eq('id', guestId),
        db.from('email_logs').insert({ event_id: event.id, guest_id: guest.id, status: 'sent' }),
      ])

      return NextResponse.json({ success: true })
    } catch (emailError: unknown) {
      const message = emailError instanceof Error ? emailError.message : 'Unknown error'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('email_logs').insert({
        event_id: event.id,
        guest_id: guest.id,
        status: 'failed',
        error_message: message,
      })
      return NextResponse.json({ error: 'Email failed to send', detail: message }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
