import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Guest, Event } from '@/types/supabase'
import Link from 'next/link'
import ReportsFilters from './ReportsFilters'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: {
    period?: string
    dateFrom?: string
    dateTo?: string
    eventId?: string
    status?: string
    minRate?: string
  }
}) {
  // Auth check via session client
  const serverSupabase = createClient()
  void (await serverSupabase.auth.getUser())

  // All data fetched via admin client — bypasses RLS for accurate counts
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const now = new Date()
  const period = searchParams.period ?? 'all_time'

  let startStr: string | null = null
  let endStr: string | null = null

  if (period === 'custom' && searchParams.dateFrom && searchParams.dateTo) {
    startStr = searchParams.dateFrom
    endStr = searchParams.dateTo
  } else if (period === 'this_month') {
    startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  } else if (period === 'last_month') {
    startStr = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    endStr = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
  }
  // all_time: startStr/endStr stay null — no date filter

  // All events for dropdown
  const { data: allEventsData } = await db
    .from('events')
    .select('id, name')
    .order('event_date', { ascending: false })
  const allEventsForDropdown = (allEventsData ?? []) as { id: string; name: string }[]

  // Filtered events query
  let eventsQuery = db
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  if (startStr) eventsQuery = eventsQuery.gte('event_date', startStr)
  if (endStr) eventsQuery = eventsQuery.lte('event_date', endStr)
  if (searchParams.eventId && searchParams.eventId !== 'all') {
    eventsQuery = eventsQuery.eq('id', searchParams.eventId)
  }
  if (searchParams.status && searchParams.status !== 'all') {
    eventsQuery = eventsQuery.eq('status', searchParams.status)
  }

  const { data: eventsData } = await eventsQuery
  const events = (eventsData ?? []) as Event[]
  const eventIds = events.map(e => e.id)

  // Guests for filtered events
  let allGuests: Guest[] = []
  if (eventIds.length > 0) {
    const { data: guestData } = await db
      .from('guests')
      .select('*')
      .in('event_id', eventIds)
    allGuests = (guestData ?? []) as Guest[]
  }

  // Min attendance rate post-filter
  const minRate = searchParams.minRate ? parseInt(searchParams.minRate) : 0

  const eventRows = events.map(event => {
    const eventGuests = allGuests.filter(g => g.event_id === event.id)
    const attended = eventGuests.filter(g => g.checked_in).length
    const invites = eventGuests.length
    const eventRate = invites > 0 ? Math.round((attended / invites) * 100) : 0
    return { event, eventGuests, attended, invites, eventRate }
  }).filter(row => row.eventRate >= minRate)

  const filteredGuests = eventRows.flatMap(r => r.eventGuests)
  const totalEvents = eventRows.length
  const totalGuests = filteredGuests.length
  const totalCheckedIn = filteredGuests.filter(g => g.checked_in).length
  const avgRate = totalGuests > 0 ? Math.round((totalCheckedIn / totalGuests) * 100) : 0

  const statusColor: Record<string, string> = {
    draft: 'text-[#9CA3AF] bg-[#9CA3AF]/10',
    active: 'text-[#16A34A] bg-[#16A34A]/10',
    completed: 'text-[#800000] bg-[#800000]/10',
  }

  const exportParams = new URLSearchParams()
  exportParams.set('period', period)
  if (searchParams.dateFrom) exportParams.set('dateFrom', searchParams.dateFrom)
  if (searchParams.dateTo) exportParams.set('dateTo', searchParams.dateTo)
  if (searchParams.eventId) exportParams.set('eventId', searchParams.eventId)
  if (searchParams.status) exportParams.set('status', searchParams.status)
  if (searchParams.minRate) exportParams.set('minRate', searchParams.minRate)

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold">Reports</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">Aggregate event performance</p>
        </div>
        <Link
          href={`/api/reports/export?${exportParams.toString()}`}
          className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
        >
          Export PDF
        </Link>
      </div>

      <ReportsFilters
        period={period}
        dateFrom={searchParams.dateFrom ?? ''}
        dateTo={searchParams.dateTo ?? ''}
        eventId={searchParams.eventId ?? 'all'}
        status={searchParams.status ?? 'all'}
        minRate={searchParams.minRate ?? '0'}
        allEvents={allEventsForDropdown}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Events', value: totalEvents },
          { label: 'Total Guests', value: totalGuests },
          { label: 'Total Checked In', value: totalCheckedIn },
          { label: 'Avg Attendance Rate', value: `${avgRate}%` },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-5">
            <div className="text-[#9CA3AF] text-sm mb-1">{stat.label}</div>
            <div className="text-white text-3xl font-semibold font-mono">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Per-event table */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-medium text-sm">Events in Period</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {['Event', 'Date', 'Invites', 'Attended', 'Rate', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3.5 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {eventRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[#9CA3AF] text-sm py-12">
                    No events match the selected filters
                  </td>
                </tr>
              )}
              {eventRows.map(({ event, attended, invites, eventRate }) => (
                <tr key={event.id} className="hover:bg-[#2A2A2A]/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/events/${event.id}/report`} className="text-white text-sm hover:text-[#800000] transition-colors font-medium">
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[#9CA3AF] text-sm font-mono">
                    {new Date(event.event_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-[#9CA3AF] text-sm font-mono">{invites}</td>
                  <td className="px-5 py-3.5 text-[#9CA3AF] text-sm font-mono">{attended}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-mono">{eventRate}%</span>
                      <div className="w-16 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                        <div className="h-full bg-[#800000] rounded-full" style={{ width: `${eventRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColor[event.status]}`}>
                      {event.status}
                    </span>
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
