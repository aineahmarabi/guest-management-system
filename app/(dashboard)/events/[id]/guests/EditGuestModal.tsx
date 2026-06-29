'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Doc } from '@/convex/_generated/dataModel'

type Guest = Doc<'guests'>

export default function EditGuestModal({ guest, onClose }: { guest: Guest; onClose: () => void }) {
  const router = useRouter()
  const updateGuest = useMutation(api.guests.update)
  const deleteExcessEscorts = useMutation(api.escorts.deleteExcess)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: guest.full_name,
    email: guest.email,
    phone: guest.phone ?? '',
    escort_count: guest.escort_count,
  })

  function validate(): string {
    if (!form.full_name.trim()) return 'Full name is required.'
    if (!form.email.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email address.'
    if (form.escort_count < 0 || form.escort_count > 20) return 'Escort count must be between 0 and 20.'
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)
    setError('')
    try {
      await updateGuest({
        id: guest._id,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        escort_count: form.escort_count,
      })

      if (form.escort_count < guest.escort_count) {
        await deleteExcessEscorts({ guest_id: guest._id, keep_count: form.escort_count })
      }

      router.refresh()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update guest.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-semibold">Edit Guest</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm rounded-[6px] px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">
              Full Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              value={form.full_name}
              onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Full name"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">
              Email <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+254 700 000000"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">Escorts</label>
              <input
                type="number"
                value={form.escort_count}
                onChange={e => setForm(prev => ({ ...prev, escort_count: Math.max(0, parseInt(e.target.value) || 0) }))}
                min="0"
                max="20"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
              />
            </div>
          </div>

          {form.escort_count < guest.escort_count && (
            <p className="text-[#D97706] text-xs">
              Reducing escorts from {guest.escort_count} to {form.escort_count} will remove {guest.escort_count - form.escort_count} escort record(s).
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#800000] hover:bg-[#6B0000] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-[6px] transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-5 py-2 rounded-[6px] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
