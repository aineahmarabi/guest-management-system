import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateTicketId } from '@/lib/ticket'
import { generateTicketPDF } from '@/lib/pdf'
import { sendEmail, buildInviteEmailHtml } from '@/lib/email'
import { Event } from '@/types/supabase'

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = createClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId, guests } = await request.json()
    if (!eventId || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json({ error: 'eventId and guests array are required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single()
    if (!eventData) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    const event = eventData as Event

    const formattedDate = new Date(event.event_date).toLocaleDateString('en-KE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

    let imported = 0
    const errors: string[] = []

    for (const g of guests) {
      const full_name = (g.full_name ?? '').trim()
      const email = (g.email ?? '').trim().toLowerCase()
      const phone = (g.phone ?? '').trim() || null
      const escort_count = Math.max(0, parseInt(g.escort_count ?? '0') || 0)

      if (!full_name || !email) {
        errors.push(`Skipped — missing name or email: "${full_name || '?'}"`)
        continue
      }

      const ticketId = generateTicketId(eventId)

      const { data: newGuest, error: insertError } = await db.from('guests').insert({
        event_id: eventId,
        full_name,
        email,
        phone,
        ticket_id: ticketId,
        escort_count,
        created_by: user.id,
      }).select().single()

      if (insertError) {
        errors.push(`Failed to import "${full_name}": ${insertError.message}`)
        continue
      }

      // Auto-send ticket email
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

        await db.from('guests').update({ email_sent: true, pdf_generated: true }).eq('id', newGuest.id)
      } catch {
        // Email failed — guest is imported, can resend manually
      }

      imported++
    }

    return NextResponse.json({ imported, errors })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
