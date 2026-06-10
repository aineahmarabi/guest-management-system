import { createClient } from '@/lib/supabase/server'
import { Event } from '@/types/supabase'
import Link from 'next/link'

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string }
}) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  let query = db
    .from('events')
    .select(`*, guests(count)`)
    .order('event_date', { ascending: false })

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }

  if (searchParams.q) {
    query = query.ilike('name', `%${searchParams.q}%`)
  }

  const { data } = await query
  const events = (data ?? []) as (Event & { guests: { count: number }[] })[]

  const statusColor: Record<string, string> = {
    draft: 'text-[#9CA3AF] bg-[#9CA3AF]/10 border-[#9CA3AF]/20',
    active: 'text-[#16A34A] bg-[#16A34A]/10 border-[#16A34A]/20',
    completed: 'text-[#800000] bg-[#800000]/10 border-[#800000]/20',
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Events</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">
            {events.length} events total
          </p>
        </div>
        <Link
          href="/events/new"
          className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
        >
          + New Event
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <form className="flex flex-col sm:flex-row flex-wrap gap-3">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search events..."
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] w-full sm:w-64"
          />
          <select
            name="status"
            defaultValue={searchParams.status ?? 'all'}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <button
            type="submit"
            className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm px-4 py-2 rounded-[6px] transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3.5 uppercase tracking-wider">Event</th>
              <th className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3.5 uppercase tracking-wider">Date</th>
              <th className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3.5 uppercase tracking-wider">Venue</th>
              <th className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3.5 uppercase tracking-wider">Status</th>
              <th className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3.5 uppercase tracking-wider">Guests</th>
              <th className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3.5 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[#9CA3AF] text-sm py-12">
                  No events found.{' '}
                  <Link href="/events/new" className="text-[#800000] hover:underline">Create one</Link>
                </td>
              </tr>
            )}
            {events.map(event => (
              <tr key={event.id} className="hover:bg-[#2A2A2A]/30 transition-colors">
                <td className="px-5 py-3.5">
                  <Link href={`/events/${event.id}`} className="text-white font-medium text-sm hover:text-[#800000] transition-colors">
                    {event.name}
                  </Link>
                  {event.description && (
                    <div className="text-[#9CA3AF] text-xs mt-0.5 truncate max-w-xs">{event.description}</div>
                  )}
                </td>
                <td className="px-5 py-3.5 text-[#9CA3AF] text-sm font-mono">
                  {new Date(event.event_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-[#9CA3AF] text-sm">{event.venue}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border capitalize ${statusColor[event.status]}`}>
                    {event.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[#9CA3AF] text-sm font-mono">
                  {event.guests?.[0]?.count ?? 0}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <Link href={`/events/${event.id}`} className="text-[#9CA3AF] hover:text-white text-xs transition-colors">
                      View
                    </Link>
                    <span className="text-[#2A2A2A]">·</span>
                    <Link href={`/events/${event.id}/guests`} className="text-[#9CA3AF] hover:text-white text-xs transition-colors">
                      Guests
                    </Link>
                    <span className="text-[#2A2A2A]">·</span>
                    <Link href={`/events/${event.id}/checkin`} className="text-[#9CA3AF] hover:text-white text-xs transition-colors">
                      Check-in
                    </Link>
                  </div>
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
