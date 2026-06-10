'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateTicketId } from '@/lib/ticket'
import Link from 'next/link'

interface EscortEntry {
  full_name: string
  id_number: string
}

export default function NewGuestPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    escort_count: 0,
  })

  const [escorts, setEscorts] = useState<EscortEntry[]>([])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    if (name === 'escort_count') {
      const count = Math.max(0, parseInt(value) || 0)
      setForm(prev => ({ ...prev, escort_count: count }))
      setEscorts(Array.from({ length: count }, (_, i) => escorts[i] ?? { full_name: '', id_number: '' }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  function handleEscortChange(index: number, field: keyof EscortEntry, value: string) {
    setEscorts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.full_name || !form.email) {
      setError('Full name and email are required.')
      return
    }

    if (form.escort_count > 0 && escorts.some(esc => !esc.full_name.trim())) {
      setError('Please enter a name for each escort.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: { user } } = await supabase.auth.getUser()

    const { count } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    const nextNumber = (count ?? 0) + 1
    const ticketId = generateTicketId(eventId, nextNumber)

    const { data: guest, error: guestError } = await db
      .from('guests')
      .insert({
        event_id: eventId,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        ticket_id: ticketId,
        escort_count: form.escort_count,
        created_by: user?.id,
      })
      .select()
      .single()

    if (guestError) {
      setError('Failed to add guest. The email may already exist for this event.')
      setLoading(false)
      return
    }

    if (form.escort_count > 0 && escorts.length > 0) {
      await db.from('escorts').insert(
        escorts.map(esc => ({
          guest_id: guest.id,
          full_name: esc.full_name,
          id_number: esc.id_number || null,
        }))
      )
    }

    router.push(`/events/${eventId}/guests`)
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-2xl">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#9CA3AF] mb-6">
        <Link href="/events" className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A]">Events</Link>
        <span className="text-[#4B5563]">/</span>
        <Link href={`/events/${eventId}`} className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A]">Event</Link>
        <span className="text-[#4B5563]">/</span>
        <Link href={`/events/${eventId}/guests`} className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A]">Guests</Link>
        <span className="text-[#4B5563]">/</span>
        <span className="text-white px-1.5 py-0.5">Add Guest</span>
      </div>

      <h1 className="text-white text-2xl font-semibold mb-8">Add Guest</h1>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-6">
        {error && (
          <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm rounded-[6px] px-4 py-3 mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">
                Full Name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">
                Email <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">Phone (optional)</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+254 700 000000"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">Number of Escorts</label>
              <input
                type="number"
                name="escort_count"
                value={form.escort_count}
                onChange={handleChange}
                min="0"
                max="10"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
              />
            </div>
          </div>

          {form.escort_count > 0 && (
            <div className="border border-[#2A2A2A] rounded-[6px] p-4 space-y-3">
              <div className="text-sm text-[#9CA3AF] font-medium">Escort Details</div>
              {escorts.map((escort, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#9CA3AF] mb-1">Escort {i + 1} Name *</label>
                    <input
                      value={escort.full_name}
                      onChange={e => handleEscortChange(i, 'full_name', e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9CA3AF] mb-1">ID Number (optional)</label>
                    <input
                      value={escort.id_number}
                      onChange={e => handleEscortChange(i, 'id_number', e.target.value)}
                      placeholder="National ID / Passport"
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#800000] hover:bg-[#6B0000] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-[6px] transition-colors"
            >
              {loading ? 'Adding...' : 'Add Guest'}
            </button>
            <Link
              href={`/events/${eventId}/guests`}
              className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-5 py-2 rounded-[6px] transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
