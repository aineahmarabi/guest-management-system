import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ScanPage({ params }: { params: { ticketId: string } }) {
  const token = await convexAuthNextjsToken()
  if (!token) redirect(`/login?next=/scan/${params.ticketId}`)

  const guest = await fetchQuery(api.guests.getByTicketId, { ticket_id: params.ticketId.trim() }, { token })

  if (!guest) {
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

  const event = await fetchQuery(api.events.getById, { id: guest.event_id }, { token })

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

  await fetchMutation(api.guests.checkIn, { id: guest._id }, { token })
  const checkedInAt = new Date().toISOString()
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
