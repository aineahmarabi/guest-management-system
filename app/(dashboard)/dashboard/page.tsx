import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Event, Guest } from '@/types/supabase'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch profile via admin client
  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user?.id ?? '')
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any
  const isEventManager = profile?.role === 'event_manager'

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Base queries — event managers see only their events
  let totalEventsQuery = db.from('events').select('*', { count: 'exact', head: true })
  let eventsThisMonthQuery = db.from('events').select('*', { count: 'exact', head: true }).gte('created_at', firstOfMonth)
  let upcomingEventsQuery = db
    .from('events')
    .select('id, name, venue, event_date, event_time, status')
    .gte('event_date', now.toISOString().split('T')[0])
    .order('event_date', { ascending: true })
    .limit(5)

  const [
    totalEventsRes,
    eventsThisMonthRes,
    totalGuestsRes,
    upcomingEventsRes,
    recentGuestsRes,
    checkedInGuestsRes,
  ] = await Promise.all([
    totalEventsQuery,
    eventsThisMonthQuery,
    supabase.from('guests').select('*', { count: 'exact', head: true }),
    upcomingEventsQuery,
    db
      .from('guests')
      .select('id, full_name, ticket_id, email_sent, checked_in, event_id, events(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('checked_in', true),
  ])

  const totalEvents = totalEventsRes.count ?? 0
  const eventsThisMonth = eventsThisMonthRes.count ?? 0
  const totalGuests = totalGuestsRes.count ?? 0
  const checkedInCount = checkedInGuestsRes.count ?? 0
  const upcomingEvents = (upcomingEventsRes.data ?? []) as Event[]
  const recentGuests = (recentGuestsRes.data ?? []) as (Guest & { events: { name: string } | null })[]

  const attendanceRate = totalGuests > 0
    ? Math.round((checkedInCount / totalGuests) * 100)
    : 0

  const statusColor: Record<string, string> = {
    draft: 'text-[#9CA3AF] bg-[#9CA3AF]/10',
    active: 'text-[#16A34A] bg-[#16A34A]/10',
    completed: 'text-[#800000] bg-[#800000]/10',
  }

  const welcomeName = profile?.full_name ? profile.full_name.split(' ')[0] : 'there'

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-white text-xl md:text-2xl font-semibold">
          Welcome back, {welcomeName}
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          Overview of all events and guests
        </p>
      </div>

      {/* Stats */}
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
        {/* Upcoming Events */}
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
                key={event.id}
                href={`/events/${event.id}`}
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

        {/* Recent Guests */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
            <h2 className="text-white font-medium text-sm">Recently Added Guests</h2>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {recentGuests.length === 0 && (
              <div className="px-5 py-6 text-[#9CA3AF] text-sm text-center">No guests added yet</div>
            )}
            {recentGuests.map(guest => (
              <div key={guest.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-white text-sm font-medium">{guest.full_name}</div>
                  <div className="text-[#9CA3AF] text-xs mt-0.5">{guest.events?.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#9CA3AF] text-xs font-mono">{guest.ticket_id}</div>
                  <div className="flex gap-1.5 mt-1 justify-end">
                    {guest.email_sent && (
                      <span className="text-xs text-[#16A34A] bg-[#16A34A]/10 px-1.5 py-0.5 rounded">Email sent</span>
                    )}
                    {guest.checked_in && (
                      <span className="text-xs text-[#800000] bg-[#800000]/10 px-1.5 py-0.5 rounded">Checked in</span>
                    )}
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
