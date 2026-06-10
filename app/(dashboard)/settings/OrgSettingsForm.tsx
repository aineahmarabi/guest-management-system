'use client'

import { useState } from 'react'

interface OrgData {
  company_name: string
  website: string
  email: string
  phone: string
  address: string
}

export default function OrgSettingsForm({ initial }: { initial: OrgData }) {
  const [form, setForm] = useState<OrgData>(initial)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/admin/org-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save.')
      return
    }

    setSaved(true)
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-5 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-medium text-sm">Organisation</h2>
        {saved && (
          <span className="text-[#16A34A] text-xs flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved
          </span>
        )}
      </div>

      {error && (
        <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm rounded-[6px] px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Company Name</label>
            <input
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              required
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Website</label>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="www.example.com"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Contact Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="info@example.com"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+254 700 000000"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Address</label>
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            rows={2}
            className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors resize-none"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#800000] hover:bg-[#6B0000] disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-[6px] transition-colors"
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
