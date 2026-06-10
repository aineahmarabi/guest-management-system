import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CheckinScanner from './CheckinScanner'

export default async function CheckinPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, name, event_date, venue')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const [{ count: totalGuests }, { count: checkedIn }] = await Promise.all([
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', params.id),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', params.id).eq('checked_in', true),
  ])

  return (
    <CheckinScanner
      event={event}
      initialTotal={totalGuests ?? 0}
      initialCheckedIn={checkedIn ?? 0}
    />
  )
}
