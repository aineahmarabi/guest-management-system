'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-[#9CA3AF] bg-[#9CA3AF]/10 border-[#9CA3AF]/20',
  active: 'text-[#16A34A] bg-[#16A34A]/10 border-[#16A34A]/20',
  completed: 'text-[#800000] bg-[#800000]/10 border-[#800000]/20',
}

export default function EventsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')

  const allEvents = useQuery(api.events.list, {})
  const loading = allEvents === undefined

  const guestCounts = useQuery(
    api.guests.countsByEvent,
    allEvents ? { eventIds: allEvents.map(e => e._id) } : 'skip'
  )

  const events = (allEvents ?? []).filter(e => {
    const matchStatus = status === 'all' || e.status === status
    const term = q.trim().toLowerCase()
    const matchQ = !term ||
      e.name.toLowerCase().includes(term) ||
      e.venue.toLowerCase().includes(term) ||
      (e.description ?? '').toLowerCase().includes(term)
    return matchStatus && matchQ
  })

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Events</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">
            {loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''}${q || status !== 'all' ? ' matching filter' : ' total'}`}
          </p>
        </div>
        <Link href="/events/new" className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors">
          + New Event
        </Link>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-3">
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, venue…"
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] w-full sm:w-64 transition-colors"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {['Event', 'Date', 'Venue', 'Status', 'Guests', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3.5 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {loading && Array.from({ length: 4 }, (_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-3 bg-[#2A2A2A] rounded w-40 mb-1" /><div className="h-2 bg-[#2A2A2A] rounded w-28" /></td>
                  <td className="px-5 py-4"><div className="h-3 bg-[#2A2A2A] rounded w-20" /></td>
                  <td className="px-5 py-4"><div className="h-3 bg-[#2A2A2A] rounded w-32" /></td>
                  <td className="px-5 py-4"><div className="h-5 bg-[#2A2A2A] rounded-full w-16" /></td>
                  <td className="px-5 py-4"><div className="h-3 bg-[#2A2A2A] rounded w-8" /></td>
                  <td className="px-5 py-4"><div className="h-3 bg-[#2A2A2A] rounded w-28" /></td>
                </tr>
              ))}
              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[#9CA3AF] text-sm py-12">
                    {q || status !== 'all' ? 'No events match your filter.' : 'No events yet. '}
                    {!q && status === 'all' && <Link href="/events/new" className="text-[#800000] hover:underline">Create one</Link>}
                  </td>
                </tr>
              )}
              {!loading && events.map(event => (
                <tr key={event._id} className="hover:bg-[#2A2A2A]/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/events/${event._id}`} className="text-white font-medium text-sm hover:text-[#800000] transition-colors">
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
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border capitalize ${STATUS_COLOR[event.status]}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#9CA3AF] text-sm font-mono">{guestCounts?.[event._id] ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Link href={`/events/${event._id}`} className="text-[#9CA3AF] hover:text-white text-xs transition-colors">View</Link>
                      <span className="text-[#2A2A2A]">·</span>
                      <Link href={`/events/${event._id}/guests`} className="text-[#9CA3AF] hover:text-white text-xs transition-colors">Guests</Link>
                      <span className="text-[#2A2A2A]">·</span>
                      <Link href={`/events/${event._id}/checkin`} className="text-[#9CA3AF] hover:text-white text-xs transition-colors">Check-in</Link>
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
