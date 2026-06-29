'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { Id } from '@/convex/_generated/dataModel'

export default function EventLiveStats({ eventId }: { eventId: Id<'events'> }) {
  const counts = useQuery(api.guests.countByEvent, { event_id: eventId })
  const guests = useQuery(api.guests.listByEvent, { event_id: eventId })

  const total = counts?.total ?? 0
  const checkedInCount = counts?.checked_in ?? 0
  const pending = total - checkedInCount
  const emailSent = counts?.email_sent ?? 0

  const displayedGuests = guests ? guests.slice(-5).reverse() : []

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Guests', value: total },
          { label: 'Checked In', value: checkedInCount, accent: true },
          { label: 'Pending', value: pending },
          { label: 'Emails Sent', value: emailSent },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-4">
            <div className="text-[#9CA3AF] text-xs mb-1">{stat.label}</div>
            <div className={`text-2xl font-semibold font-mono ${stat.accent ? 'text-[#16A34A]' : 'text-white'}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-medium text-sm">Recent Guests</h2>
          <Link href={`/events/${eventId}/guests`} className="text-[#800000] text-xs hover:underline">View all</Link>
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
              {displayedGuests.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-[#9CA3AF] text-sm py-8">
                    No guests yet.{' '}
                    <Link href={`/events/${eventId}/guests/new`} className="text-[#800000] hover:underline">Add one</Link>
                  </td>
                </tr>
              )}
              {displayedGuests.map(guest => (
                <tr key={guest._id} className="hover:bg-[#2A2A2A]/30 transition-colors">
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
    </>
  )
}
