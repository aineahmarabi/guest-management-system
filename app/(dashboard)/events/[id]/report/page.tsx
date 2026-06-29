import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Id } from '@/convex/_generated/dataModel'

export default async function EventReportPage({ params }: { params: { id: string } }) {
  const token = await convexAuthNextjsToken()
  if (!token) return null

  const event = await fetchQuery(api.events.getById, { id: params.id as Id<'events'> }, { token })
  if (!event) notFound()

  const [guests, bouncedCount] = await Promise.all([
    fetchQuery(api.guests.listByEventForReport, { event_id: event._id }, { token }),
    fetchQuery(api.emailLogs.countFailedByEvent, { event_id: event._id }, { token }),
  ])

  const total = guests.length
  const checkedIn = guests.filter(g => g.checked_in).length
  const noShows = total - checkedIn
  const emailSent = guests.filter(g => g.email_sent).length
  const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0

  const timeline: Record<string, number> = {}
  guests.forEach(g => {
    if (g.checked_in && g.checked_in_at) {
      const eat = new Date(new Date(g.checked_in_at).getTime() + 3 * 60 * 60 * 1000)
      const label = `${String(eat.getUTCHours()).padStart(2, '0')}:00`
      timeline[label] = (timeline[label] ?? 0) + 1
    }
  })
  const timelineEntries = Object.entries(timeline).sort((a, b) => a[0].localeCompare(b[0]))
  const maxCount = Math.max(...timelineEntries.map(([, c]) => c), 1)

  const statusColor: Record<string, string> = {
    draft: 'text-[#9CA3AF] bg-[#9CA3AF]/10',
    active: 'text-[#16A34A] bg-[#16A34A]/10',
    completed: 'text-[#800000] bg-[#800000]/10',
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#9CA3AF] mb-6">
        <Link href="/events" className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A]">Events</Link>
        <span className="text-[#4B5563]">/</span>
        <Link href={`/events/${event._id}`} className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A] truncate max-w-[160px]">{event.name}</Link>
        <span className="text-[#4B5563]">/</span>
        <span className="text-white px-1.5 py-0.5">Report</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-2xl font-semibold">Event Report</h1>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-white text-lg font-semibold">{event.name}</h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColor[event.status]}`}>
            {event.status}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-[#9CA3AF]">Date</span>
            <div className="text-white font-mono mt-0.5">
              {new Date(event.event_date).toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Time</span>
            <div className="text-white font-mono mt-0.5">{event.event_time}</div>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Venue</span>
            <div className="text-white mt-0.5">{event.venue}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Invites Sent', value: emailSent },
          { label: 'Delivered', value: emailSent - bouncedCount < 0 ? 0 : emailSent - bouncedCount },
          { label: 'Bounced', value: bouncedCount, color: '#DC2626' },
          { label: 'Attended', value: checkedIn, color: '#16A34A' },
          { label: 'No-shows', value: noShows, color: '#D97706' },
          { label: 'Attendance Rate', value: `${rate}%`, color: '#800000' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-4">
            <div className="text-[#9CA3AF] text-xs mb-1">{stat.label}</div>
            <div className="text-2xl font-semibold font-mono" style={{ color: stat.color ?? '#FFFFFF' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {timelineEntries.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-6 mb-6">
          <h2 className="text-white font-medium text-sm mb-4">Check-in Timeline — EAT (Arrivals per Hour)</h2>
          <div className="flex items-end gap-2 h-24">
            {timelineEntries.map(([hour, count]) => (
              <div key={hour} className="flex flex-col items-center gap-1 flex-1">
                <div className="text-[#9CA3AF] text-xs font-mono">{count}</div>
                <div className="w-full bg-[#800000] rounded-t-[2px] transition-all" style={{ height: `${(count / maxCount) * 64}px`, minHeight: '4px' }} />
                <div className="text-[#9CA3AF] text-xs font-mono">{hour}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-medium text-sm">Guest List ({total} guests)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {['Name', 'Ticket ID', 'Email Sent', 'Checked In', 'Check-in Time (EAT)', 'Escorts'].map(h => (
                  <th key={h} className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {guests.map(guest => (
                <tr key={guest._id} className="hover:bg-[#2A2A2A]/30 transition-colors">
                  <td className="px-5 py-3 text-white text-sm">
                    <div>{guest.full_name}</div>
                    <div className="text-[#9CA3AF] text-xs">{guest.email}</div>
                  </td>
                  <td className="px-5 py-3 text-[#9CA3AF] text-xs font-mono">{guest.ticket_id}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${guest.email_sent ? 'text-[#16A34A] bg-[#16A34A]/10' : 'text-[#9CA3AF] bg-[#2A2A2A]'}`}>
                      {guest.email_sent ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${guest.checked_in ? 'text-[#16A34A] bg-[#16A34A]/10' : 'text-[#9CA3AF] bg-[#2A2A2A]'}`}>
                      {guest.checked_in ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#9CA3AF] text-xs font-mono">
                    {guest.checked_in_at
                      ? new Date(guest.checked_in_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-[#9CA3AF] text-sm font-mono text-center">{guest.escort_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
