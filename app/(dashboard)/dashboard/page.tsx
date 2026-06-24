import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api, internal } from '@/convex/_generated/api'
import Link from 'next/link'

export default async function DashboardPage() {
  const token = await convexAuthNextjsToken()
  if (!token) return null

  const [profile, counts, upcomingEvents, recentGuests] = await Promise.all([
    fetchQuery(api.profiles.getMe, {}, { token }),
    fetchQuery(api.guests.countsAll, {}, { token }),
    fetchQuery(api.events.upcoming, { limit: 5 }, { token }),
    fetchQuery(api.guests.recentAll, { limit: 5 }, { token }),
  ])

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const allEvents = await fetchQuery(api.events.list, {}, { token })
  const totalEvents = allEvents.length
  const eventsThisMonth = allEvents.filter(e => e.created_at >= firstOfMonth).length
  const totalGuests = counts.total
  const checkedInCount = counts.checked_in
  const attendanceRate = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0

  // For recent guests, fetch their event names
  const recentWithEvents = await Promise.all(
    recentGuests.map(async g => {
      const event = await fetchQuery(api.events.getById, { id: g.event_id }, { token })
      return { ...g, eventName: event?.name ?? null }
    })
  )

  const statusColor: Record<string, string> = {
    draft: 'text-[#9CA3AF] bg-[#9CA3AF]/10',
    active: 'text-[#16A34A] bg-[#16A34A]/10',
    completed: 'text-[#800000] bg-[#800000]/10',
  }

  const welcomeName = profile?.full_name ? profile.full_name.split(' ')[0] : 'there'

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-white text-xl md:text-2xl font-semibold">Welcome back, {welcomeName}</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Overview of all events and guests</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Total Events', value: totalEvents },
          { label: 'Events This Month', value: eventsThisMonth },
          { label: 'Total Guests', value: totalGuests },
          { label: 'Avg Attendance', value: `${attendanceRate}%` },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-3 md:p-5">
            <div className="text-[#9CA3AF] text-xs md:text-sm mb-1">{stat.label}</div>
            <div className="text-white text-2xl md:text-3xl font-semibold font-mono">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
            <h2 className="text-white font-medium text-sm">Upcoming Events</h2>
            <Link href="/events" className="text-[#800000] text-xs hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {upcomingEvents.length === 0 && (
              <div className="px-5 py-6 text-[#9CA3AF] text-sm text-center">No upcoming events</div>
            )}
            {upcomingEvents.map(event => (
              <Link
                key={event._id}
                href={`/events/${event._id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-[#2A2A2A]/50 transition-colors"
              >
                <div>
                  <div className="text-white text-sm font-medium">{event.name}</div>
                  <div className="text-[#9CA3AF] text-xs mt-0.5">{event.venue}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#9CA3AF] text-xs font-mono">
                    {new Date(event.event_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[event.status]}`}>
                    {event.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
            <h2 className="text-white font-medium text-sm">Recently Added Guests</h2>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {recentWithEvents.length === 0 && (
              <div className="px-5 py-6 text-[#9CA3AF] text-sm text-center">No guests added yet</div>
            )}
            {recentWithEvents.map(guest => (
              <div key={guest._id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-white text-sm font-medium">{guest.full_name}</div>
                  <div className="text-[#9CA3AF] text-xs mt-0.5">{guest.eventName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#9CA3AF] text-xs font-mono">{guest.ticket_id}</div>
                  <div className="flex gap-1.5 mt-1 justify-end">
                    {guest.email_sent && <span className="text-xs text-[#16A34A] bg-[#16A34A]/10 px-1.5 py-0.5 rounded">Email sent</span>}
                    {guest.checked_in && <span className="text-xs text-[#800000] bg-[#800000]/10 px-1.5 py-0.5 rounded">Checked in</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
