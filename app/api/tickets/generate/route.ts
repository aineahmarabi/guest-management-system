import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateTicketPDF } from '@/lib/pdf'
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

    const { data, error: guestError } = await supabase
      .from('guests')
      .select('*, events(*)')
      .eq('id', guestId)
      .single()

    if (guestError || !data) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    const guest = data as Guest & { events: Event }
    const event = guest.events

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('guests')
      .update({ pdf_generated: true })
      .eq('id', guestId)

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
