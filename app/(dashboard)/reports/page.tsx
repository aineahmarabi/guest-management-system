import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import ReportsFilters from './ReportsFilters'
import { Id } from '@/convex/_generated/dataModel'

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
  const token = await convexAuthNextjsToken()
  if (!token) return null

  const now = new Date()
  const period = searchParams.period ?? 'all_time'

  let startStr: string
  let endStr: string

  if (period === 'custom' && searchParams.dateFrom && searchParams.dateTo) {
    startStr = searchParams.dateFrom
    endStr = searchParams.dateTo
  } else if (period === 'this_month') {
    startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  } else if (period === 'last_month') {
    startStr = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    endStr = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
  } else {
    // all_time — use a wide date range
    startStr = '2000-01-01'
    endStr = '2099-12-31'
  }

  const allEvents = await fetchQuery(api.events.list, {}, { token })
  const allEventsForDropdown = allEvents.map(e => ({ id: e._id, name: e.name }))

  const filteredEvents = await fetchQuery(
    api.events.listInRange,
    {
      startDate: startStr,
      endDate: endStr,
      status: (searchParams.status && searchParams.status !== 'all') ? searchParams.status : undefined,
      eventId: (searchParams.eventId && searchParams.eventId !== 'all') ? searchParams.eventId as Id<'events'> : undefined,
    },
    { token }
  )

  const minRate = searchParams.minRate ? parseInt(searchParams.minRate) : 0

  const allGuestArrays = await Promise.all(
    filteredEvents.map(e => fetchQuery(api.guests.listByEventForReport, { event_id: e._id }, { token }))
  )

  const eventRows = filteredEvents.map((event, i) => {
    const eventGuests = allGuestArrays[i]
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
                <tr key={event._id} className="hover:bg-[#2A2A2A]/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/events/${event._id}/report`} className="text-white text-sm hover:text-[#800000] transition-colors font-medium">
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
