import { createClient } from '@/lib/supabase/server'
import { Guest, Event } from '@/types/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditEventForm from './EditEventForm'
import BulkEmailButton from './BulkEmailButton'

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: eventData } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!eventData) notFound()

  const event = eventData as Event

  const [
    totalGuestsRes,
    checkedInRes,
    emailSentRes,
    recentGuestsRes,
  ] = await Promise.all([
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', params.id),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', params.id).eq('checked_in', true),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', params.id).eq('email_sent', true),
    supabase.from('guests').select('*').eq('event_id', params.id).order('created_at', { ascending: false }).limit(5),
  ])

  const total = totalGuestsRes.count ?? 0
  const checkedInCount = checkedInRes.count ?? 0
  const pending = total - checkedInCount
  const recentGuests = (recentGuestsRes.data ?? []) as Guest[]

  const statusColor: Record<string, string> = {
    draft: 'text-[#9CA3AF] bg-[#9CA3AF]/10 border-[#9CA3AF]/20',
    active: 'text-[#16A34A] bg-[#16A34A]/10 border-[#16A34A]/20',
    completed: 'text-[#800000] bg-[#800000]/10 border-[#800000]/20',
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#9CA3AF] mb-6">
        <Link href="/events" className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A]">Events</Link>
        <span className="text-[#4B5563]">/</span>
        <span className="text-white px-1.5 py-0.5 truncate max-w-[200px]">{event.name}</span>
      </div>

      {/* Event header */}
      <div className="flex flex-col sm:flex-row items-start gap-4 mb-6 md:mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
            <h1 className="text-white text-xl md:text-2xl font-semibold">{event.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border capitalize ${statusColor[event.status]}`}>
              {event.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 text-[#9CA3AF] text-sm">
            <span className="font-mono">
              {new Date(event.event_date).toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <span>·</span>
            <span className="font-mono">{event.event_time}</span>
            <span>·</span>
            <span>{event.venue}</span>
          </div>
          {event.description && (
            <p className="text-[#9CA3AF] text-sm mt-2">{event.description}</p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Guests', value: total },
          { label: 'Checked In', value: checkedInCount, accent: true },
          { label: 'Pending', value: pending },
          { label: 'Emails Sent', value: emailSentRes.count ?? 0 },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-4">
            <div className="text-[#9CA3AF] text-xs mb-1">{stat.label}</div>
            <div className={`text-2xl font-semibold font-mono ${stat.accent ? 'text-[#16A34A]' : 'text-white'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href={`/events/${params.id}/guests/new`}
          className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
        >
          + Add Guest
        </Link>
        <Link
          href={`/events/${params.id}/guests`}
          className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
        >
          View All Guests
        </Link>
        <BulkEmailButton eventId={params.id} guestCount={total} />
        <Link
          href={`/events/${params.id}/checkin`}
          className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
        >
          Check-in Scanner
        </Link>
        <Link
          href={`/events/${params.id}/report`}
          className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
        >
          View Report
        </Link>
      </div>

      {/* Recent guests */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-medium text-sm">Recent Guests</h2>
          <Link href={`/events/${params.id}/guests`} className="text-[#800000] text-xs hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Name', 'Email', 'Ticket ID', 'Email Sent', 'Checked In'].map(h => (
                <th key={h} className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {recentGuests.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-[#9CA3AF] text-sm py-8">
                  No guests yet.{' '}
                  <Link href={`/events/${params.id}/guests/new`} className="text-[#800000] hover:underline">Add one</Link>
                </td>
              </tr>
            )}
            {recentGuests.map(guest => (
              <tr key={guest.id} className="hover:bg-[#2A2A2A]/30 transition-colors">
                <td className="px-5 py-3 text-white text-sm">{guest.full_name}</td>
                <td className="px-5 py-3 text-[#9CA3AF] text-sm">{guest.email}</td>
                <td className="px-5 py-3 text-[#9CA3AF] text-xs font-mono">{guest.ticket_id}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${guest.email_sent ? 'text-[#16A34A] bg-[#16A34A]/10' : 'text-[#9CA3AF] bg-[#2A2A2A]'}`}>
                    {guest.email_sent ? 'Sent' : 'Pending'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${guest.checked_in ? 'text-[#16A34A] bg-[#16A34A]/10' : 'text-[#9CA3AF] bg-[#2A2A2A]'}`}>
                    {guest.checked_in ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Edit form */}
      <EditEventForm event={event} />
    </div>
  )
}
