import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditEventForm from './EditEventForm'
import BulkEmailButton from './BulkEmailButton'
import EventLiveStats from './EventLiveStats'
import { Id } from '@/convex/_generated/dataModel'

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const token = await convexAuthNextjsToken()
  if (!token) return null

  const event = await fetchQuery(api.events.getById, { id: params.id as Id<'events'> }, { token })
  if (!event) notFound()

  const statusColor: Record<string, string> = {
    draft: 'text-[#9CA3AF] bg-[#9CA3AF]/10 border-[#9CA3AF]/20',
    active: 'text-[#16A34A] bg-[#16A34A]/10 border-[#16A34A]/20',
    completed: 'text-[#800000] bg-[#800000]/10 border-[#800000]/20',
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#9CA3AF] mb-6">
        <Link href="/events" className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A]">Events</Link>
        <span className="text-[#4B5563]">/</span>
        <span className="text-white px-1.5 py-0.5 truncate max-w-[200px]">{event.name}</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-4 mb-6 md:mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
            <h1 className="text-white text-xl md:text-2xl font-semibold">{event.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border capitalize ${statusColor[event.status]}`}>
              {event.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 text-[#9CA3AF] text-sm">
            <span className="font-mono">
              {new Date(event.event_date).toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <span>·</span>
            <span className="font-mono">{event.event_time}</span>
            <span>·</span>
            <span>{event.venue}</span>
          </div>
          {event.description && <p className="text-[#9CA3AF] text-sm mt-2">{event.description}</p>}
        </div>
      </div>

      <EventLiveStats eventId={event._id} />

      <div className="flex flex-wrap gap-3 mb-8">
        <Link href={`/events/${params.id}/guests/new`} className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors">
          + Add Guest
        </Link>
        <Link href={`/events/${params.id}/guests`} className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors">
          View All Guests
        </Link>
        <BulkEmailButton eventId={params.id} />
        <Link href={`/events/${params.id}/checkin`} className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors">
          Check-in Scanner
        </Link>
        <Link href={`/events/${params.id}/report`} className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors">
          View Report
        </Link>
      </div>

      <EditEventForm event={event} />
    </div>
  )
}
