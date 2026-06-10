'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Event } from '@/types/supabase'

export default function EditEventForm({ event }: { event: Event }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    name: event.name,
    description: event.description ?? '',
    venue: event.venue,
    event_date: event.event_date,
    event_time: event.event_time,
    status: event.status,
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any)
      .from('events')
      .update({
        name: form.name,
        description: form.description || null,
        venue: form.venue,
        event_date: form.event_date,
        event_time: form.event_time,
        status: form.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id)

    setLoading(false)
    if (dbError) {
      setError('Failed to update event.')
      return
    }
    setSuccess(true)
    router.refresh()
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-6">
      <h2 className="text-white font-medium text-sm mb-5">Edit Event Details</h2>

      {error && (
        <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm rounded-[6px] px-4 py-3 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[#16A34A]/10 border border-[#16A34A]/30 text-[#16A34A] text-sm rounded-[6px] px-4 py-3 mb-4">
          Event updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Event Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Venue</label>
            <input
              name="venue"
              value={form.venue}
              onChange={handleChange}
              required
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={2}
            className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Date</label>
            <input
              type="date"
              name="event_date"
              value={form.event_date}
              onChange={handleChange}
              required
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Time</label>
            <input
              type="time"
              name="event_time"
              value={form.event_time}
              onChange={handleChange}
              required
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Status</label>
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-[#800000] hover:bg-[#6B0000] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
