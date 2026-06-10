import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Guest } from '@/types/supabase'

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = createClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ticketId, eventId } = await request.json()

    if (!ticketId) {
      return NextResponse.json({ status: 'invalid', message: 'No ticket ID provided' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let query = supabase
      .from('guests')
      .select('*')
      .eq('ticket_id', ticketId.trim())

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data } = await query
    const guests = (data ?? []) as Guest[]

    if (guests.length === 0) {
      return NextResponse.json({ status: 'invalid', message: 'INVALID TICKET — Gate Crasher' })
    }

    const guest = guests[0]

    if (guest.checked_in) {
      return NextResponse.json({
        status: 'already_checked_in',
        message: `ALREADY CHECKED IN — ${guest.full_name}`,
        guestName: guest.full_name,
        checkedInAt: guest.checked_in_at,
        escortCount: guest.escort_count,
      })
    }

    const checkedInAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('guests')
      .update({ checked_in: true, checked_in_at: checkedInAt } as never)
      .eq('id', guest.id)

    if (updateError) {
      return NextResponse.json({ status: 'invalid', message: 'Check-in failed, please try again' })
    }

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
