import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import GuestListLive from './GuestListLive'
import { Id } from '@/convex/_generated/dataModel'

export default async function GuestListPage({ params }: { params: { id: string } }) {
  const token = await convexAuthNextjsToken()
  if (!token) return null

  const event = await fetchQuery(api.events.getById, { id: params.id as Id<'events'> }, { token })
  if (!event) notFound()

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#9CA3AF] mb-6">
        <Link href="/events" className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A]">Events</Link>
        <span className="text-[#4B5563]">/</span>
        <Link href={`/events/${params.id}`} className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A] truncate max-w-[160px]">{event.name}</Link>
        <span className="text-[#4B5563]">/</span>
        <span className="text-white px-1.5 py-0.5">Guests</span>
      </div>

      <GuestListLive eventId={event._id} eventName={event.name} />
    </div>
  )
}
