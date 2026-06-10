import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Guest, Event } from '@/types/supabase'

export default async function ScanPage({ params }: { params: { ticketId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/scan/${params.ticketId}`)

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: guestData } = await db
    .from('guests')
    .select('*, events(*)')
    .eq('ticket_id', params.ticketId.trim())
    .single()

  if (!guestData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D] p-4">
        <div className="bg-[#1A1A1A] border border-[#DC2626]/40 rounded-[6px] p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="text-[#DC2626] text-xl font-bold mb-2">INVALID TICKET</h1>
          <p className="text-[#9CA3AF] text-sm mb-1 font-mono">{params.ticketId}</p>
          <p className="text-[#9CA3AF] text-sm mb-6">This ticket does not exist.</p>
          <Link href="/checkin" className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm px-5 py-2 rounded-[6px] transition-colors">
            Back to Check-In
          </Link>
        </div>
      </div>
    )
  }

  const guest = guestData as Guest & { events: Event }
  const event = guest.events

  // Already checked in — show info without re-checking
  if (guest.checked_in) {
    const checkedInTime = guest.checked_in_at
      ? new Date(guest.checked_in_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
      : '—'

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D] p-4">
        <div className="bg-[#1A1A1A] border border-yellow-500/40 rounded-[6px] p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-yellow-400 text-xl font-bold mb-2">ALREADY CHECKED IN</h1>
          <p className="text-white text-lg font-semibold mb-1">{guest.full_name}</p>
          <p className="text-[#9CA3AF] text-sm mb-1">{event?.name}</p>
          <p className="text-[#9CA3AF] text-sm mb-6">Checked in at {checkedInTime}</p>
          <Link href="/checkin" className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm px-5 py-2 rounded-[6px] transition-colors">
            Back to Check-In
          </Link>
        </div>
      </div>
    )
  }

  // Perform check-in
  const checkedInAt = new Date().toISOString()
  await db
    .from('guests')
    .update({ checked_in: true, checked_in_at: checkedInAt })
    .eq('id', guest.id)

  // Fire confirmation email (non-blocking)
  if (event) {
    const formattedDate = new Date(event.event_date).toLocaleDateString('en-KE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
    const formattedTime = new Date(checkedInAt).toLocaleTimeString('en-KE', {
      hour: '2-digit', minute: '2-digit',
    })
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://dualpix-gms.vercel.app'}/api/checkin/confirm-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: guest.full_name,
        guestEmail: guest.email,
        eventName: event.name,
        eventDate: formattedDate,
        eventTime: event.event_time,
        venue: event.venue,
        checkedInAt: formattedTime,
        escortCount: guest.escort_count,
      }),
    }).catch(() => {})
  }

  const checkedInTime = new Date(checkedInAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D] p-4">
      <div className="bg-[#1A1A1A] border border-[#16A34A]/40 rounded-[6px] p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-[#16A34A] text-xl font-bold mb-2">ADMITTED</h1>
        <p className="text-white text-lg font-semibold mb-1">{guest.full_name}</p>
        <p className="text-[#9CA3AF] text-sm mb-1">{event?.name}</p>
        {guest.escort_count > 0 && (
          <p className="text-[#9CA3AF] text-sm mb-1">+ {guest.escort_count} escort(s)</p>
        )}
        <p className="text-[#4B5563] text-xs mb-6 font-mono">{checkedInTime}</p>
        <Link href="/checkin" className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm px-5 py-2 rounded-[6px] transition-colors">
          Back to Check-In
        </Link>
      </div>
    </div>
  )
}
