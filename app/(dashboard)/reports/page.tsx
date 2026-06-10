import { createClient } from '@/lib/supabase/server'
import { Guest, Event } from '@/types/supabase'
import Link from 'next/link'

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
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const now = new Date()
  const period = searchParams.period ?? 'this_month'

  let startDate: Date
  let endDate: Date

  if (period === 'custom' && searchParams.dateFrom && searchParams.dateTo) {
    startDate = new Date(searchParams.dateFrom)
    endDate = new Date(searchParams.dateTo)
  } else if (period === 'last_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    endDate = new Date(now.getFullYear(), now.getMonth(), 0)
  } else {
    // this_month default
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // Fetch ALL events for the dropdown
  const { data: allEventsData } = await db
    .from('events')
    .select('id, name')
    .order('event_date', { ascending: false })
  const allEventsForDropdown = (allEventsData ?? []) as { id: string; name: string }[]

  // Build filtered events query
  let eventsQuery = db
    .from('events')
    .select('*')
    .gte('event_date', startStr)
    .lte('event_date', endStr)
    .order('event_date', { ascending: false })

  if (searchParams.eventId && searchParams.eventId !== 'all') {
    eventsQuery = eventsQuery.eq('id', searchParams.eventId)
  }

  if (searchParams.status && searchParams.status !== 'all') {
    eventsQuery = eventsQuery.eq('status', searchParams.status)
  }

  const { data: eventsData } = await eventsQuery
  const events = (eventsData ?? []) as Event[]
  const eventIds = events.map(e => e.id)

  let allGuests: Guest[] = []
  if (eventIds.length > 0) {
    const { data: guestData } = await supabase
      .from('guests')
      .select('*')
      .in('event_id', eventIds)
    allGuests = (guestData ?? []) as Guest[]
  }

  // Apply minRate filter (post-fetch)
  const minRate = searchParams.minRate ? parseInt(searchParams.minRate) : 0

  const eventRows = events.map(event => {
    const eventGuests = allGuests.filter(g => g.event_id === event.id)
    const attended = eventGuests.filter(g => g.checked_in).length
    const invites = eventGuests.length
    const eventRate = invites > 0 ? Math.round((attended / invites) * 100) : 0
    return { event, eventGuests, attended, invites, eventRate }
  }).filter(row => row.eventRate >= minRate)

  const filteredEvents = eventRows.map(r => r.event)
  const filteredGuests = eventRows.flatMap(r => r.eventGuests)

  const totalEvents = filteredEvents.length
  const totalGuests = filteredGuests.length
  const totalCheckedIn = filteredGuests.filter(g => g.checked_in).length
  const avgRate = totalGuests > 0 ? Math.round((totalCheckedIn / totalGuests) * 100) : 0

  const statusColor: Record<string, string> = {
    draft: 'text-[#9CA3AF] bg-[#9CA3AF]/10',
    active: 'text-[#16A34A] bg-[#16A34A]/10',
    completed: 'text-[#800000] bg-[#800000]/10',
  }

  // Build export URL
  const exportParams = new URLSearchParams()
  if (period) exportParams.set('period', period)
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

      {/* Filter panel */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-5 mb-8">
        <form className="space-y-4">
          {/* Row 1: Period */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Period</label>
              <select
                name="period"
                defaultValue={period}
                className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            {period === 'custom' && (
              <>
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">From</label>
                  <input
                    type="date"
                    name="dateFrom"
                    defaultValue={searchParams.dateFrom ?? ''}
                    className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">To</label>
                  <input
                    type="date"
                    name="dateTo"
                    defaultValue={searchParams.dateTo ?? ''}
                    className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Row 2: Event, Status, Min Rate */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Event</label>
              <select
                name="eventId"
                defaultValue={searchParams.eventId ?? 'all'}
                className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] max-w-xs"
              >
                <option value="all">All Events</option>
                {allEventsForDropdown.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Status</label>
              <select
                name="status"
                defaultValue={searchParams.status ?? 'all'}
                className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Min Attendance Rate %</label>
              <input
                type="number"
                name="minRate"
                min="0"
                max="100"
                defaultValue={searchParams.minRate ?? '0'}
                className="w-24 bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

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
                      <div
                        className="h-full bg-[#800000] rounded-full"
                        style={{ width: `${eventRate}%` }}
                      />
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
