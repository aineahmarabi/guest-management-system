'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    venue: '',
    event_date: '',
    event_time: '',
    status: 'draft' as 'draft' | 'active' | 'completed',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name || !form.venue || !form.event_date || !form.event_time) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error: dbError } = await db
      .from('events')
      .insert({
        name: form.name,
        description: form.description || null,
        venue: form.venue,
        event_date: form.event_date,
        event_time: form.event_time,
        status: form.status,
        created_by: user?.id,
      })
      .select()
      .single()

    if (dbError) {
      setError('Failed to create event. Please try again.')
      setLoading(false)
      return
    }

    router.push(`/events/${data.id}`)
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-2">
          <Link href="/events" className="hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-[#2A2A2A]">Events</Link>
          <span className="text-[#4B5563]">/</span>
          <span className="text-white px-1.5 py-0.5">New Event</span>
        </div>
        <h1 className="text-white text-2xl font-semibold">Create Event</h1>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-6">
        {error && (
          <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm rounded-[6px] px-4 py-3 mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">
              Event Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Annual Gala Dinner 2025"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional event description..."
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">
              Venue <span className="text-[#DC2626]">*</span>
            </label>
            <input
              name="venue"
              value={form.venue}
              onChange={handleChange}
              placeholder="e.g. Radisson Blu Hotel, Nairobi"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">
                Date <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="date"
                name="event_date"
                value={form.event_date}
                onChange={handleChange}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">
                Time <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="time"
                name="event_time"
                value={form.event_time}
                onChange={handleChange}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#800000] hover:bg-[#6B0000] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-[6px] transition-colors"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
            <Link
              href="/events"
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
