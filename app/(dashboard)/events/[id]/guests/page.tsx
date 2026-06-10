import { createClient } from '@/lib/supabase/server'
import { Guest } from '@/types/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import GuestActions from './GuestActions'
import GuestListControls from './GuestListControls'

export default async function GuestListPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: eventData } = await supabase
    .from('events')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (!eventData) notFound()

  const event = eventData as { id: string; name: string }

  const { data } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', params.id)
    .order('created_at', { ascending: true })

  const guests = (data ?? []) as Guest[]

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#9CA3AF] mb-6">
        <Link href="/events" className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A]">Events</Link>
        <span className="text-[#4B5563]">/</span>
        <Link href={`/events/${params.id}`} className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A] truncate max-w-[160px]">{event.name}</Link>
        <span className="text-[#4B5563]">/</span>
        <span className="text-white px-1.5 py-0.5">Guests</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Guest List</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">{guests.length} guests for {event.name}</p>
        </div>
        <GuestListControls eventId={params.id} />
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Guest', 'Ticket ID', 'Escorts', 'Email Sent', 'Checked In', 'Check-in Time', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3.5 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {guests.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[#9CA3AF] text-sm py-12">
                  No guests yet.{' '}
                  <Link href={`/events/${params.id}/guests/new`} className="text-[#800000] hover:underline">Add the first guest</Link>
                </td>
              </tr>
            )}
            {guests.map(guest => (
              <tr key={guest.id} className="hover:bg-[#2A2A2A]/30 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="text-white text-sm font-medium">{guest.full_name}</div>
                  <div className="text-[#9CA3AF] text-xs">{guest.email}</div>
                  {guest.phone && <div className="text-[#9CA3AF] text-xs">{guest.phone}</div>}
                </td>
                <td className="px-5 py-3.5 text-[#9CA3AF] text-xs font-mono">{guest.ticket_id}</td>
                <td className="px-5 py-3.5 text-[#9CA3AF] text-sm font-mono text-center">{guest.escort_count}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${guest.email_sent ? 'text-[#16A34A] bg-[#16A34A]/10' : 'text-[#9CA3AF] bg-[#2A2A2A]'}`}>
                    {guest.email_sent ? 'Sent' : 'Pending'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${guest.checked_in ? 'text-[#16A34A] bg-[#16A34A]/10' : 'text-[#9CA3AF] bg-[#2A2A2A]'}`}>
                    {guest.checked_in ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[#9CA3AF] text-xs font-mono">
                  {guest.checked_in_at
                    ? new Date(guest.checked_in_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </td>
                <td className="px-5 py-3.5">
                  <GuestActions guest={guest} eventId={params.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
