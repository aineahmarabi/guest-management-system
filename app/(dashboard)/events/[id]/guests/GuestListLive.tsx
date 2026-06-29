'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { Id } from '@/convex/_generated/dataModel'
import GuestActions from './GuestActions'
import GuestListControls from './GuestListControls'

export default function GuestListLive({
  eventId,
  eventName,
}: {
  eventId: Id<'events'>
  eventName: string
}) {
  const guests = useQuery(api.guests.listByEvent, { event_id: eventId })
  const list = guests ?? []

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Guest List</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">{list.length} guests for {eventName}</p>
        </div>
        <GuestListControls eventId={eventId} />
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
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-[#9CA3AF] text-sm py-12">
                    No guests yet.{' '}
                    <Link href={`/events/${eventId}/guests/new`} className="text-[#800000] hover:underline">Add the first guest</Link>
                  </td>
                </tr>
              )}
              {list.map(guest => (
                <tr key={guest._id} className="hover:bg-[#2A2A2A]/30 transition-colors">
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
                      ? new Date(guest.checked_in_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <GuestActions guest={guest} eventId={eventId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
