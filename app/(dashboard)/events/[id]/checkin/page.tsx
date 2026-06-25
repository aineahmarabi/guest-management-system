import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { notFound } from 'next/navigation'
import { Id } from '@/convex/_generated/dataModel'
import CheckinScanner from './CheckinScanner'

export default async function CheckinPage({ params }: { params: { id: string } }) {
  const token = await convexAuthNextjsToken()
  if (!token) return null

  const event = await fetchQuery(api.events.getById, { id: params.id as Id<'events'> }, { token })
  if (!event) notFound()

  return (
    <CheckinScanner
      event={{ _id: event._id, name: event.name, event_date: event.event_date, venue: event.venue }}
    />
  )
}
